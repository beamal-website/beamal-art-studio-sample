import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.mjs';
import {createPostgresDatabase} from './postgres-database.mjs';

const sampleDir=resolve(fileURLToPath(new URL('..',import.meta.url)));
const quote=name=>'"'+String(name).replaceAll('"','""')+'"';
const fail=message=>{throw new Error(message)};

function importOrder(source,tables){
 const remaining=new Set(tables),ordered=[];
 const parents=new Map(tables.map(table=>[table,new Set(source.prepare(`PRAGMA foreign_key_list(${quote(table)})`).all().map(row=>row.table).filter(parent=>parent!==table&&remaining.has(parent)))]));
 while(remaining.size){const ready=[...remaining].filter(table=>[...parents.get(table)].every(parent=>!remaining.has(parent))).sort();if(!ready.length)fail(`SQLite schema contains a foreign-key cycle: ${[...remaining].join(', ')}.`);for(const table of ready){ordered.push(table);remaining.delete(table);}}
 return ordered;
}

export function verifyFreshTarget(database,tables){
 for(const table of tables){
  const count=Number(database.prepare(`SELECT COUNT(*) AS count FROM ${quote(table)}`).get().count);
  if(!count)continue;
  if(table==='class_types'&&count===2){const ids=database.prepare('SELECT id FROM class_types').all().map(row=>row.id).sort();if(ids.join(',')==='00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000002')continue;}
  if(table==='schema_metadata'&&count===1&&database.prepare('SELECT value FROM schema_metadata WHERE name=?').get('normalized_fees_v1')?.value==='1')continue;
  if(['course_sequence','fee_sequence'].includes(table)&&count===1&&database.prepare(`SELECT value FROM ${quote(table)} WHERE id=1`).get()?.value===0)continue;
  if(table==='availability_public_settings'&&count===1){const settings=database.prepare('SELECT id,show_full_trial_slots,show_rescheduling_slots,version FROM availability_public_settings').get();if(Number(settings?.id)===1&&Number(settings.show_full_trial_slots)===0&&Number(settings.show_rescheduling_slots)===0&&Number(settings.version)===0)continue;}
  fail(`Supabase table "${table}" already contains data. Stop here; import only into an empty target or review a separate merge plan.`);
 }
}

export async function importSqliteToPostgres({sourcePath=resolve(sampleDir,'.data/local-demo/beamal.sqlite'),databaseUrl=process.env.DATABASE_URL}={}){
 if(typeof databaseUrl!=='string'||!/^postgres(?:ql)?:\/\//i.test(databaseUrl))fail('Set DATABASE_URL in the environment before importing. Do not put credentials in source code.');
 sourcePath=resolve(sourcePath);let source;
 try{source=new DatabaseSync(sourcePath,{readOnly:true});}catch(error){fail(`Cannot open the source SQLite database: ${error.message}`);}
 let store,destination;
 try{
  store=await createStore({databasePath:':memory:',databaseUrl,seedUsers:[],seedCourses:[]});await store.close();store=null;
  destination=await createPostgresDatabase(databaseUrl);
  const targetTables=destination.prepare("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE'").all().map(row=>row.table_name);
  verifyFreshTarget(destination,targetTables);
  const sourceTables=source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
  for(const table of sourceTables)if(!targetTables.includes(table))fail(`Source table "${table}" has no PostgreSQL schema. Deploy the matching application build before importing.`);
  const ordered=importOrder(source,sourceTables);destination.exec('BEGIN');let totalRows=0;
  try{
   for(const table of ordered){
    const columns=source.prepare(`PRAGMA table_info(${quote(table)})`).all(),columnNames=columns.map(column=>column.name),primary=columns.filter(column=>column.pk).sort((a,b)=>a.pk-b.pk).map(column=>column.name);
    if(!columnNames.length)continue;
    const rows=source.prepare(`SELECT * FROM ${quote(table)}`).all();
    for(let offset=0;offset<rows.length;offset+=200){
     const chunk=rows.slice(offset,offset+200),rowMarks='('+columnNames.map(()=>'?').join(',')+')',values=chunk.flatMap(row=>columnNames.map(name=>row[name])),columnsSql=columnNames.map(quote).join(','),conflict=primary.length?` ON CONFLICT (${primary.map(quote).join(',')}) DO UPDATE SET ${columnNames.filter(name=>!primary.includes(name)).map(name=>`${quote(name)}=EXCLUDED.${quote(name)}`).join(',')}`:' ON CONFLICT DO NOTHING';
     const suffix=primary.length&&!columnNames.some(name=>!primary.includes(name))?' ON CONFLICT DO NOTHING':conflict;
     destination.prepare(`INSERT INTO ${quote(table)} (${columnsSql}) VALUES ${chunk.map(()=>rowMarks).join(',')}${suffix}`).run(...values);
    }
    totalRows+=rows.length;
   }
   for(const table of sourceTables){
    const idColumn=source.prepare(`PRAGMA table_info(${quote(table)})`).all().find(column=>column.name==='id'&&column.pk===1&&/^INTEGER$/i.test(column.type));if(!idColumn)continue;
    const sequence=destination.prepare('SELECT pg_get_serial_sequence(?,?) AS sequence').get(table,'id')?.sequence;if(!sequence)continue;
    const max=destination.prepare(`SELECT MAX(${quote('id')}) AS value FROM ${quote(table)}`).get().value;
    destination.prepare('SELECT setval($1::regclass,$2::bigint,$3::boolean)').get(sequence,max===null?1:max,max!==null);
   }
   destination.exec('COMMIT');
  }catch(error){try{destination.exec('ROLLBACK')}catch{}throw error;}
  return {sourcePath,tables:ordered.length,rows:totalRows};
 }finally{source.close();if(destination)destination.close();if(store)await store.close();}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await importSqliteToPostgres({sourcePath:process.env.SQLITE_SOURCE_PATH||resolve(sampleDir,'.data/local-demo/beamal.sqlite')});console.log(`Imported ${result.rows} rows from ${result.tables} tables. Existing SQLite data was not modified.`);}
 catch(error){console.error(`SQLite import failed: ${error.message}`);process.exitCode=1;}
}