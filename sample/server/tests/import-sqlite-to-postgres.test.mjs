import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {verifyFreshTarget} from '../import-sqlite-to-postgres.mjs';

function targetWithAvailabilitySettings(settings){
 const database=new DatabaseSync(':memory:');
 database.exec('CREATE TABLE availability_public_settings(id INTEGER PRIMARY KEY,show_full_trial_slots INTEGER NOT NULL,show_rescheduling_slots INTEGER NOT NULL,version INTEGER NOT NULL)');
 database.prepare('INSERT INTO availability_public_settings VALUES(?,?,?,?)').run(...settings);
 return database;
}

test('allows only the unchanged availability settings bootstrap row in a fresh target',()=>{
 const database=targetWithAvailabilitySettings([1,0,0,0]);
 try{assert.doesNotThrow(()=>verifyFreshTarget(database,['availability_public_settings']));}
 finally{database.close();}
});

test('rejects modified availability settings in the import target',()=>{
 const database=targetWithAvailabilitySettings([1,1,0,1]);
 try{assert.throws(()=>verifyFreshTarget(database,['availability_public_settings']),/already contains data/);}
 finally{database.close();}
});
