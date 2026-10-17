import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEnrollmentScalePlan,parseEnrollmentScaleArgs} from '../benchmarks/enrollment-scale-plan.mjs';

const startMinutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3));
const day=date=>Date.parse(date+'T00:00:00Z')/86400000;
function actualLessons(plan){return plan.classes.flatMap(group=>Array.from({length:plan.occurrencesPerClass},(_,index)=>({...group,start:(day(group.startDate)+7*index)*1440+startMinutes(group.time),end:(day(group.startDate)+7*index)*1440+startMinutes(group.time)+group.duration})));}
function assertNoConflicts(lessons){for(let left=0;left<lessons.length;left++)for(let right=left+1;right<lessons.length;right++){const a=lessons[left],b=lessons[right];if(a.teacherIndex===b.teacherIndex||a.roomIndex===b.roomIndex)assert.ok(a.end<=b.start||b.end<=a.start,`${a.id} overlaps ${b.id}`);}}

test('legacy scale CLI without class-capacity retains six Friday classes old time slots and per-course capacity',()=>{
 assert.deepEqual(parseEnrollmentScaleArgs([]),{studentCount:300,classCapacity:undefined});assert.deepEqual(parseEnrollmentScaleArgs(['--students','12']),{studentCount:12,classCapacity:undefined});
 const plan=buildEnrollmentScalePlan({studentCount:300});assert.equal(plan.classes.length,6);assert.equal(plan.classCapacity,50);assert.deepEqual(plan.classes.map(group=>group.time),['09:00','10:15','11:30','13:00','14:15','15:30']);assert.ok(plan.classes.every(group=>group.startDate==='2026-10-16'&&group.weekday===5&&group.studentIndices.length===50));assertNoConflicts(actualLessons(plan));
});

test('300 Student small-class plan conserves every exact course assignment across 42 realistic classes and partial final rosters',()=>{
 const plan=buildEnrollmentScalePlan({studentCount:300,classCapacity:8});assert.equal(plan.courseCount,6);assert.equal(plan.teacherCount,4);assert.equal(plan.classes.length,42);assert.equal(plan.students.length,300);assert.equal(plan.occurrencesPerClass,3);
 const seen=new Set(),byId=new Map(plan.classes.map(group=>[group.id,group]));assert.equal(byId.size,42);
 for(let courseIndex=0;courseIndex<6;courseIndex++){
  const groups=plan.classes.filter(group=>group.courseIndex===courseIndex);assert.equal(groups.length,Math.ceil(50/8));assert.deepEqual(groups.map(group=>group.studentIndices.length),[8,8,8,8,8,8,2]);
  for(const group of groups){assert.equal(group.capacity,8);assert.ok(group.studentIndices.length<=8&&group.studentIndices.length>0);for(const index of group.studentIndices){assert.ok(!seen.has(index));seen.add(index);assert.equal(index%6,courseIndex);const student=plan.students[index];assert.equal(student.studentIndex,index);assert.equal(student.classId,group.id);assert.equal(student.courseIndex,courseIndex);assert.equal(byId.get(student.classId),group);}}
 }
 assert.equal(seen.size,300);assert.deepEqual([...seen].sort((a,b)=>a-b),Array.from({length:300},(_,index)=>index));assert.equal(plan.students[0].classId,plan.students[6].classId);assert.notEqual(plan.students[0].classId,plan.students[48].classId);assert.notEqual(plan.students[0].classId,plan.students[1].classId);
 assert.deepEqual(Array.from({length:4},(_,teacher)=>plan.classes.filter(group=>group.teacherIndex===teacher).length),[11,11,10,10]);
});

test('weekly small-class schedule and the one-occurrence 08:45 move never overlap any teacher or room',()=>{
 const plan=buildEnrollmentScalePlan({studentCount:300,classCapacity:8}),lessons=actualLessons(plan);assert.equal(lessons.length,126);assertNoConflicts(lessons);
 const moved=lessons.map((lesson,index)=>index===0?{...lesson,start:day(lesson.startDate)*1440+8*60+45,end:day(lesson.startDate)*1440+9*60+45}:lesson);assertNoConflicts(moved);assert.ok(plan.classes.some(group=>group.weekday===6),'42 small classes must use enough weekly resource buckets.');
});

test('capacity exceeding cohort creates truthful partial classes rather than inventing Full occupancy',()=>{
 const plan=buildEnrollmentScalePlan({studentCount:12,classCapacity:8});assert.equal(plan.classes.length,6);assert.equal(plan.classes.reduce((sum,group)=>sum+group.studentIndices.length,0),12);assert.ok(plan.classes.every(group=>group.capacity===8&&group.studentIndices.length===2));assertNoConflicts(actualLessons(plan));
});

test('scale CLI accepts independent optional capacity and rejects duplicate unknown and unsafe plans explicitly',()=>{
 assert.deepEqual(parseEnrollmentScaleArgs(['--class-capacity','8','--students','300']),{studentCount:300,classCapacity:8});assert.deepEqual(parseEnrollmentScaleArgs(['--students','300','--class-capacity','8']),{studentCount:300,classCapacity:8});
 for(const args of [['--class-capacity','0'],['--class-capacity','1.5'],['--class-capacity','NaN'],['--class-capacity'],['--students','300','--students','300'],['--unknown','8'],['--students','301']])assert.throws(()=>parseEnrollmentScaleArgs(args));
 assert.throws(()=>buildEnrollmentScalePlan({studentCount:300,classCapacity:1}),/weekly|resource|fit/i);assert.throws(()=>buildEnrollmentScalePlan({studentCount:300,classCapacity:0}));
 const boundary=buildEnrollmentScalePlan({studentCount:336,classCapacity:2});assert.equal(boundary.classes.length,168);assertNoConflicts(actualLessons(boundary));assert.throws(()=>buildEnrollmentScalePlan({studentCount:342,classCapacity:2}),/weekly|resource|fit/i);
});
