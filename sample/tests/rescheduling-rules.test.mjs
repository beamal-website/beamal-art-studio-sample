import test from 'node:test';
import assert from 'node:assert/strict';
import {reschedulingRulesAllow} from '../shared/rescheduling-rules.js';
const source={studentId:'child',courseId:'course-a',scheduleId:'class-a'};
test('unrestricted source still enforces a student whitelist or blacklist',()=>{
 assert.equal(reschedulingRulesAllow({},source),true);
 assert.equal(reschedulingRulesAllow({studentAccessMode:'whitelist',studentIds:['other']},source),false);
 assert.equal(reschedulingRulesAllow({studentAccessMode:'whitelist',studentIds:['child']},source),true);
 assert.equal(reschedulingRulesAllow({studentAccessMode:'blacklist',studentIds:['child']},source),false);
 assert.equal(reschedulingRulesAllow({excludedStudentIds:['child']},source),false);
});
test('selected sources accept only listed courses or classes, independently of destination course',()=>{
 const slot={reschedulingSourceMode:'selected',allowedSourceCourseIds:['course-a'],allowedSourceScheduleIds:[]};
 assert.equal(reschedulingRulesAllow(slot,source),true);assert.equal(reschedulingRulesAllow(slot,{...source,courseId:'unlisted'}),false);
 assert.equal(reschedulingRulesAllow({...slot,allowedSourceCourseIds:[],allowedSourceScheduleIds:['class-a']},source),true);
 assert.equal(reschedulingRulesAllow({...slot,studentAccessMode:'blacklist',studentIds:['child']},source),false);
});
