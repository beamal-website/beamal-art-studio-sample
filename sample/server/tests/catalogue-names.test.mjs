import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,course} from './helpers.mjs';
import {validateCourse,validateCourseMetadata,validateFee} from '../validation.mjs';

test('optional English course and fee names are validated, preserved on older edits, and explicitly clearable',()=>{
 const input=course({courseNameEn:' Watercolour ',feeNameEn:' Watercolour · Single lesson '});
 const current=validateCourse(input);
 assert.equal(current.courseNameEn,'Watercolour');assert.equal(current.feeNameEn,'Watercolour · Single lesson');
 assert.equal(validateCourse({price:301},current).courseNameEn,current.courseNameEn);
 assert.equal(validateCourseMetadata({level:'Intermediate'},current).courseNameEn,current.courseNameEn);
 assert.equal(validateCourseMetadata({courseNameEn:''},current).courseNameEn,'');
 const fee={...current,courseIds:['test-course']};
 assert.equal(validateFee({price:302},{feeName:fee.feeName,feeNameEn:fee.feeNameEn,courseIds:fee.courseIds,...Object.fromEntries(['pricingModel','price','months','duration','packageType','packageTotal','bookingExpiry','onlineStore'].filter(k=>k in fee).map(k=>[k,fee[k]]))}).feeNameEn,current.feeNameEn);
 for(const value of [null,42,{},'x'.repeat(201)]){
  assert.throws(()=>validateCourse(course({courseNameEn:value})),error=>error.status===400);
  assert.throws(()=>validateCourse(course({feeNameEn:value})),error=>error.status===400);
 }
 assert.equal(Object.hasOwn(validateCourse(course()),'courseNameEn'),false);
});

test('saved bilingual names flow through catalogue and fee details without changing price, IDs, or pricing units',async t=>{
 const app=await fixture(t),admin=app.client();await admin.login();
 const created=await admin.request('/api/courses',{method:'POST',body:course({courseName:'繪本創作',courseNameEn:'Storybook Art',feeName:'繪本創作｜四堂一期',feeNameEn:'Storybook Art · 4 lessons per term',pricingModel:'package',packageType:'visits',packageTotal:4,price:1200,onlineStore:true})});
 assert.equal(created.status,201,created.text);let saved=created.body.course;
 assert.equal(saved.courseNameEn,'Storybook Art');assert.equal(saved.fees[0].feeNameEn,'Storybook Art · 4 lessons per term');
 const fee=saved.fees[0],before={id:fee.id,price:fee.price,packageTotal:fee.packageTotal,packageType:fee.packageType};
 const renamed=await admin.request('/api/fees/'+fee.id,{method:'PATCH',body:{version:fee.version,feeNameEn:'Storybook Art · Four lessons per term'}});
 assert.equal(renamed.status,200,renamed.text);
 for(const key of Object.keys(before))assert.equal(renamed.body.fee[key],before[key]);
 const edited=await admin.request('/api/courses/'+saved.id,{method:'PATCH',body:{version:app.store.getCourse(saved.id).version,level:'Junior'}});
 assert.equal(edited.status,200,edited.text);assert.equal(edited.body.course.courseNameEn,'Storybook Art');
 const catalog=await admin.request('/api/catalog');assert.equal(catalog.status,200,catalog.text);
 assert.equal(catalog.body.courses.find(row=>row.id===saved.id).courseNameEn,'Storybook Art');
 assert.equal(catalog.body.fees.find(row=>row.id===fee.id).feeNameEn,'Storybook Art · Four lessons per term');
 const publicList=await app.client().request('/api/public/catalog');assert.equal(publicList.status,200,publicList.text);
 assert.equal(publicList.body.courses.find(row=>row.id===saved.id).courseNameEn,'Storybook Art');
});
