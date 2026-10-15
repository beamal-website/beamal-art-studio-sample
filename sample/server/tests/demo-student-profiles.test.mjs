import test from 'node:test';
import assert from 'node:assert/strict';
import {chloeStudentProfile,relationalStudentProfile} from '../demo-student-profiles.mjs';

test('fictional registration dates vary naturally without preceding age three or the recent three-year window',()=>{
 for(const startDate of ['2026-10-16','2028-02-29']){
  const students=Array.from({length:299},(_,index)=>relationalStudentProfile(index,startDate));
  assert.ok(new Set(students.map(row=>row.enrollmentDate)).size>150,'Students must not all share one batch registration date');
  assert.ok(new Set(students.map(row=>row.enrollmentDate.slice(0,7))).size>20,'The sample includes newer and longer-standing registrations');
  const earliest=new Date(Date.parse(startDate+'T00:00:00Z')-1095*86400000).toISOString().slice(0,10);
  for(const [index,row]of students.entries()){
   assert.equal(new Date(row.enrollmentDate+'T00:00:00Z').toISOString().slice(0,10),row.enrollmentDate);
   assert.ok(row.enrollmentDate<=startDate&&row.enrollmentDate>=earliest);
   const thirdBirthday=String(Number(row.dateOfBirth.slice(0,4))+3)+row.dateOfBirth.slice(4);
   assert.ok(row.enrollmentDate>=thirdBirthday,'The fictional child was at least three when registering');
   assert.deepEqual(relationalStudentProfile(index,startDate),row,'Reruns preserve the same person and dates');
  }
  assert.equal(chloeStudentProfile(startDate).enrollmentDate,startDate,'Preserve the established login student registration');
 }
});
