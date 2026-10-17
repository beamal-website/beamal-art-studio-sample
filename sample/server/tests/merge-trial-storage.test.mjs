import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../store.mjs';

test('the old cloud enquiry schema migrates without changing its records and coexists with slot-backed applications after restart',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-merge-trial-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const databasePath=join(directory,'existing.sqlite'),database=new DatabaseSync(databasePath);
 database.exec(`CREATE TABLE trial_applications(
  id TEXT PRIMARY KEY,course_id TEXT,course_name TEXT NOT NULL,student_name_zh TEXT NOT NULL,student_name_en TEXT NOT NULL,
  birth_date TEXT NOT NULL,school TEXT NOT NULL,referrer_name TEXT NOT NULL,interested_timeslot TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,email TEXT NOT NULL,parent_name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL
 )`);
 database.prepare('INSERT INTO trial_applications VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('existing-enquiry',null,'Art','學生','Student','2019-05-01','School','Referrer','Saturday','12345678','parent@example.test','Parent','new','2026-10-17T00:00:00Z');
 const before=database.prepare('SELECT * FROM trial_applications').get();database.close();
 for(let restart=0;restart<2;restart++){
  const store=await createStore({databasePath,databaseUrl:''});
  try{
   assert.equal(store.trialInquiries.get('existing-enquiry').studentNameEn,'Student');
   const inspection=new DatabaseSync(databasePath,{readOnly:true});
   try{
    assert.deepEqual(inspection.prepare('SELECT * FROM trial_inquiries').get(),before);
    assert.equal(inspection.prepare('SELECT COUNT(*) AS count FROM trial_applications').get().count,0);
    assert.ok(inspection.prepare('PRAGMA table_info(trial_applications)').all().some(row=>row.name==='person_id'));
    assert.equal(inspection.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
   }finally{inspection.close();}
  }finally{await store.close();}
 }
});
