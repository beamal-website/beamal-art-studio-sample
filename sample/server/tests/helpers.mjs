import assert from 'node:assert/strict';
import {createApplication} from '../app.mjs';

export const origin = 'http://localhost:5173';
export const users = [
  {email:'admin@example.test',password:'Admin-test-password-123!',displayName:'Manager A',role:'admin'},
  {email:'admin2@example.test',password:'Second-admin-password-123!',displayName:'Manager B',role:'admin'},
  {email:'teacher@example.test',password:'Teacher-test-password-123!',displayName:'Teacher',role:'teacher'},
  {email:'student@example.test',password:'Student-test-password-123!',displayName:'Student A',role:'student'},
  {email:'student2@example.test',password:'Another-student-password-123!',displayName:'Student B',role:'student'},
];
export const seedCourses = [
  {id:'public-course',courseName:'Published art',feeName:'Four lessons',category:'Art',level:'Beginner',pricingModel:'package',price:1000,packageType:'lessons',packageTotal:4,bookingExpiry:null,onlineStore:true},
  {id:'private-course',courseName:'Internal art',feeName:'Internal fee',category:'Art',level:'Advanced',pricingModel:'package',price:1200,packageType:'lessons',packageTotal:4,bookingExpiry:null,onlineStore:false},
];

export function course(overrides={}) {
  return {courseName:'Watercolour studio',feeName:'Standard fee',category:'Art',level:'Beginner',pricingModel:'monthly-lessons',price:300,duration:60,months:1,bookingExpiry:null,onlineStore:false,...overrides};
}

// Independent cookie jars reproduce separate browsers rather than assigning role variables.
export class Client {
  constructor(base) { this.base=base; this.cookies=new Map(); this.csrfToken=''; }
  async request(path,{method='GET',body,rawBody,csrf=true,requestOrigin=origin,headers={}}={}) {
    const requestHeaders={...headers};
    if (requestOrigin!==null) requestHeaders.Origin=requestOrigin;
    if (this.cookies.size) requestHeaders.Cookie=[...this.cookies].map(([key,value])=>`${key}=${value}`).join('; ');
    if (csrf&&this.csrfToken&&!Object.hasOwn(requestHeaders,'X-CSRF-Token')) requestHeaders['X-CSRF-Token']=this.csrfToken;
    if (body!==undefined||rawBody!==undefined) requestHeaders['Content-Type']='application/json';
    const response=await fetch(this.base+path,{method,headers:requestHeaders,body:rawBody??(body===undefined?undefined:JSON.stringify(body))});
    for (const cookie of response.headers.getSetCookie()) {
      const [pair]=cookie.split(';');
      const separator=pair.indexOf('=');
      const name=pair.slice(0,separator),value=pair.slice(separator+1);
      if (!value||/;\s*max-age=0(?:;|$)/i.test(cookie)) this.cookies.delete(name);
      else this.cookies.set(name,value);
    }
    const text=await response.text();
    let data=null;
    if (text) {
      assert.match(response.headers.get('content-type')||'',/application\/json/i,`Non-JSON API response: ${text.slice(0,200)}`);
      data=JSON.parse(text);
    }
    if (data?.csrfToken) this.csrfToken=data.csrfToken;
    return {status:response.status,body:data,headers:response.headers,text};
  }
  async login(index=0) {
    const {email,password}=users[index];
    const result=await this.request('/api/auth/login',{method:'POST',body:{email,password},csrf:false});
    assert.equal(result.status,200,result.text);
    assert.equal(result.body.user.email,email);
    assert.equal(result.body.user.role,users[index].role);
    assert.ok(result.body.csrfToken);
    assert.ok(this.cookies.size);
    return result;
  }
}

export async function fixture(t,options={}) {
  const application=await createApplication({databasePath:':memory:',seedUsers:users,seedCourses,allowedOrigins:[origin],...options});
  await new Promise((resolve,reject)=>{
    application.server.once('error',reject);
    application.server.listen(0,'127.0.0.1',resolve);
  });
  const base=`http://127.0.0.1:${application.server.address().port}`;
  let closed=false;
  const close=async()=>{if(!closed){closed=true;await application.close();}};
  t.after(close);
  return {...application,base,close,client:()=>new Client(base)};
}

export function error(result,status) {
  assert.equal(result.status,status,result.text);
  assert.equal(typeof result.body?.error?.code,'string');
  assert.equal(typeof result.body?.error?.message,'string');
  assert.ok(result.body.error.code.length);
  assert.ok(result.body.error.message.length);
}

export function publicUser(user) {
  assert.equal(typeof user.id,'string');
  assert.equal(typeof user.email,'string');
  assert.equal(typeof user.displayName,'string');
  assert.ok(['admin','teacher','student'].includes(user.role));
  for (const key of Object.keys(user)) assert.doesNotMatch(key,/password|hash|salt|secret|credential|session|csrf|token/i);
}

export function noCredentials(result) {
  for (const {password} of users) assert.ok(!result.text.includes(password),'Plaintext password leaked in API response');
  assert.doesNotMatch(result.text,/"(?:password|passwordHash|password_hash|salt|credential|sessionToken|session_token)"\s*:/i);
}

export function serverCourse(saved) {
  assert.equal(typeof saved.id,'string');
  assert.ok(saved.id.length);
  assert.equal(typeof saved.courseCode,'string');
  assert.ok(saved.courseCode.length);
  assert.equal(typeof saved.version,'number');
  assert.ok(Number.isInteger(saved.version)&&saved.version>=1);
  for (const field of ['createdAt','updatedAt']) assert.ok(Number.isFinite(Date.parse(saved[field])),`Invalid ${field}`);
}
