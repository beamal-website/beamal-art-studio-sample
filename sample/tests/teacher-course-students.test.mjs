import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeacherCourseStudents} from '../client/teacher-course-students.js';
const t=(_zh,en)=>en;
test('course student list is read-only, escaped, and cleared when teacher identity changes',async()=>{
 let ctx={identity:'teacher-a',enabled:true,courseId:'course-a',t},resolve,paints=0;
 const ui=createTeacherCourseStudents({context:()=>ctx,api:{courseStudents:()=>new Promise(done=>resolve=done)},repaint:()=>paints++});
 assert.match(ui.markup(),/Loading/);ctx={...ctx,identity:'teacher-b'};assert.doesNotMatch(ui.markup(),/Student A/);
 resolve({courseId:'course-a',students:[{id:'b',displayName:'<b>Student B</b>'}]});await new Promise(done=>setImmediate(done));
 assert.match(ui.markup(),/&lt;b&gt;Student B&lt;\/b&gt;/);assert.doesNotMatch(ui.markup(),/data-edit|<input|<b>/);assert.equal(paints,1);
});
test('a late roster response from another login cannot be displayed',async()=>{
 let ctx={identity:'a',enabled:true,courseId:'one',t},finish;
 const ui=createTeacherCourseStudents({context:()=>ctx,api:{courseStudents:()=>new Promise(done=>finish=done)},repaint:()=>{throw new Error('stale repaint');}});
 ui.markup();ctx={...ctx,identity:'b',enabled:false};finish({courseId:'one',students:[{id:'s',displayName:'Secret'}]});await new Promise(done=>setImmediate(done));assert.equal(ui.markup(),'');
});
