import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {applyCleanup} from '../../../scripts/archive-extra-demo-data.mjs';

test('QA cleanup is atomic replay-safe reversible and refuses to overwrite a subsequent edit',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec('CREATE TABLE people(id TEXT PRIMARY KEY,display_name TEXT,archived_at TEXT); INSERT INTO people VALUES (\'extra\',\'QA\',NULL),(\'keep\',\'Adopted student\',NULL)');
  const before={id:'extra',display_name:'QA',archived_at:null},after={...before,archived_at:'2026-10-19'},plan={id:'test-cleanup',createdAt:'2026-10-19',changes:[{table:'people',id:'extra',before,after}]};
  assert.equal(applyCleanup(db,plan).changed,1);assert.deepEqual({...db.prepare('SELECT * FROM people WHERE id=?').get('extra')},after);assert.equal(applyCleanup(db,plan).unchanged,true);
  db.prepare('UPDATE people SET display_name=? WHERE id=?').run('Subsequent edit','extra');assert.throws(()=>applyCleanup(db,plan,{restore:true}));assert.equal(db.prepare('SELECT display_name FROM people WHERE id=?').get('extra').display_name,'Subsequent edit');
  db.prepare('UPDATE people SET display_name=? WHERE id=?').run('QA','extra');assert.equal(applyCleanup(db,plan,{restore:true}).restored,true);assert.deepEqual({...db.prepare('SELECT * FROM people WHERE id=?').get('extra')},before);assert.equal(db.prepare('SELECT display_name FROM people WHERE id=?').get('keep').display_name,'Adopted student');
  const conflict={...plan,id:'conflict',changes:[plan.changes[0],{table:'people',id:'keep',before:{id:'keep',display_name:'Wrong',archived_at:null},after:{id:'keep',display_name:'Overwritten',archived_at:'2026-10-19'}}]};assert.throws(()=>applyCleanup(db,conflict));assert.deepEqual({...db.prepare('SELECT * FROM people WHERE id=?').get('extra')},before);
 }finally{db.close();}
});
