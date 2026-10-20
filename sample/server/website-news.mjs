import {randomUUID,createHash} from 'node:crypto';
import {ApplicationError} from './validation.mjs';
import {sampleNews} from './news-seed.mjs';
const fail=(status,code,message)=>{throw new ApplicationError(status,code,message);};
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Hong_Kong'});
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const fields=['title','titleEn','description','descriptionEn','content','contentEn','releaseDate','image'];
export function validateNews(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>![...fields,'version'].includes(key)))fail(400,'INVALID_NEWS','Provide news content only.');
 const result={};
 for(const [key,max] of [['title',120],['titleEn',120],['description',280],['descriptionEn',280],['content',20000],['contentEn',20000]]){
  const value=input[key]??'';if(typeof value!=='string'||value.length>max)fail(400,'INVALID_NEWS','Check the news text length.');result[key]=value.trim();
 }
 if(!result.title||!result.description||!result.content||!date(input.releaseDate))fail(400,'INVALID_NEWS','Provide a title, description, content and valid date.');
 const image=input.image??'';
 if(typeof image!=='string'||image.length>1400000||image&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)&&!['/assets/beamal-canvas.jpg','/assets/beamal-storybook.jpg','/assets/beamal-art.jpg'].includes(image))fail(400,'INVALID_NEWS','Choose a supported image of at most 1 MB.');
 return {...result,releaseDate:input.releaseDate,image};
}
export function createWebsiteNewsStore({database,transaction,seed=true}){
 transaction(()=>database.exec(`CREATE TABLE IF NOT EXISTS website_news(id TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL CHECK(version>0),source_key TEXT UNIQUE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS website_news_imports(content_hash TEXT PRIMARY KEY,news_id TEXT NOT NULL REFERENCES website_news(id));`));
 const project=row=>({...JSON.parse(row.data),id:row.id,version:row.version,publishedAt:row.created_at,updatedAt:row.updated_at});
 const row=id=>database.prepare('SELECT * FROM website_news WHERE id=?').get(id);
 const admin=user=>{const actor=database.prepare('SELECT id,role FROM users WHERE id=? AND archived_at IS NULL').get(user?.id||'');if(actor?.role!=='admin')fail(403,'ROLE_FORBIDDEN','Only administrators can manage website news.');};
 const insert=(id,post,sourceKey=null)=>{const now=new Date().toISOString();database.prepare('INSERT INTO website_news(id,data,version,source_key,created_at,updated_at) VALUES (?,?,1,?,?,?) ON CONFLICT(id) DO NOTHING').run(id,JSON.stringify(post),sourceKey,now,now);return project(row(id));};
 if(seed)transaction(()=>{for(const post of sampleNews()){const existing=row(post.id);if(!existing)insert(post.id,post,'seed:'+post.id);else if(existing.source_key==='seed:'+post.id&&!JSON.parse(existing.data).categoryZh){const content={...JSON.parse(existing.data),categoryZh:post.categoryZh,categoryEn:post.categoryEn};database.prepare('UPDATE website_news SET data=?,version=version+1 WHERE id=? AND version=?').run(JSON.stringify(content),post.id,existing.version);}}});
 const list=({publicOnly=false,user=null}={})=>transaction(()=>{
  if(!publicOnly)admin(user);
  return {posts:database.prepare('SELECT * FROM website_news ORDER BY updated_at DESC,id').all().map(project).filter(post=>!post.deletedAt&&(!publicOnly||post.releaseDate<=today())).sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate)||b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id))};
 },'read');
 const create=(input,user)=>transaction(()=>{admin(user);return insert(randomUUID(),validateNews(input));});
 const update=(id,input,user)=>transaction(()=>{
  admin(user);const post=validateNews(input),current=row(id);if(!current||JSON.parse(current.data).deletedAt)fail(404,'NEWS_NOT_FOUND','This news item no longer exists.');
  if(!Number.isSafeInteger(input.version)||input.version!==current.version)fail(409,'VERSION_CONFLICT','This news item changed. Reload it before saving.');
  const saved={...post,...Object.fromEntries(['categoryZh','categoryEn'].filter(key=>typeof JSON.parse(current.data)[key]==='string').map(key=>[key,JSON.parse(current.data)[key]]))};
  const changed=database.prepare('UPDATE website_news SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(JSON.stringify(saved),new Date().toISOString(),id,input.version);
  if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This news item changed. Reload it before saving.');return project(row(id));
 });
 const remove=(id,input,user)=>transaction(()=>{
  admin(user);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>key!=='version')||!Number.isSafeInteger(input.version))fail(400,'INVALID_NEWS','Provide the current news version.');
  const current=row(id);if(!current||JSON.parse(current.data).deletedAt)fail(404,'NEWS_NOT_FOUND','This news item no longer exists.');
  if(input.version!==current.version)fail(409,'VERSION_CONFLICT','This news item changed. Reload it before deleting.');
  const now=new Date().toISOString(),data={...JSON.parse(current.data),deletedAt:now};
  const changed=database.prepare('UPDATE website_news SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(JSON.stringify(data),now,id,input.version);
  if(changed.changes!==1)fail(409,'VERSION_CONFLICT','This news item changed. Reload it before deleting.');return project(row(id));
 });
 const importLegacy=(input,user)=>transaction(()=>{
  admin(user);if(!input||Object.keys(input).some(key=>key!=='posts')||!Array.isArray(input.posts)||input.posts.length>100)fail(400,'INVALID_NEWS','Import at most 100 news items.');
  // A receipt makes retries harmless. Changed local content is preserved as a new item,
  // except that an untouched built-in sample can be replaced by its edited local copy.
  let imported=0;
  for(const old of input.posts){
   if(!old||typeof old.id!=='string')fail(400,'INVALID_NEWS','Choose valid local news items.');
   const legacy=old.sample?{title:old.titleZh||old.title,titleEn:old.title,description:old.descriptionZh||old.description,descriptionEn:old.description,content:old.contentZh||old.content,contentEn:old.content,releaseDate:old.releaseDate,image:old.image}:{...Object.fromEntries(fields.map(key=>[key,old[key]??''])),releaseDate:old.releaseDate};
   const post={...validateNews(legacy),...Object.fromEntries(['categoryZh','categoryEn'].filter(key=>typeof old[key]==='string').map(key=>[key,old[key].slice(0,200)]))},hash=createHash('sha256').update(JSON.stringify([old.id,post])).digest('hex');
   if(database.prepare('SELECT news_id FROM website_news_imports WHERE content_hash=?').get(hash))continue;
   let id=old.id,current=row(id);
   if(current&&JSON.parse(current.data).deletedAt)continue;
   if(old.sample&&current?.source_key==='seed:'+id&&current.version>1){/* Keep the original shared sample. */}
   else if(current?.source_key==='seed:'+id&&current.version===1){const changed=database.prepare('UPDATE website_news SET data=?,version=version+1,updated_at=? WHERE id=? AND version=1').run(JSON.stringify(post),new Date().toISOString(),id);if(changed.changes!==1&&!old.sample){id='legacy-'+hash;insert(id,post,'legacy:'+hash);}imported++;}
   else{id='legacy-'+hash; if(!row(id)){insert(id,post,'legacy:'+hash);imported++;}}
   database.prepare('INSERT INTO website_news_imports(content_hash,news_id) VALUES (?,?) ON CONFLICT(content_hash) DO NOTHING').run(hash,id);
  }
  return {imported};
 });
 return {list,create,update,remove,importLegacy};
}
