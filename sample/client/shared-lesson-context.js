// Join the current authorized lesson and paid roster only. A request identifies
// one student session; it never supplies names, permissions or editable facts.
const id=value=>typeof value==='string'&&!!value.trim()&&value.length<=200;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const positive=value=>Number.isSafeInteger(value)&&value>0;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const attendanceStates=new Set(['unmarked','present','late','absent','leave','sick','other']);
const unavailable=()=>({status:'unavailable'});
function validClock(item){
 if(typeof item.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)||!positive(item.duration))return false;
 const [hour,minute]=item.time.split(':').map(Number);return hour*60+minute+item.duration<=1440;
}

export function resolveSharedLessonContext(snapshot={},selection={}){
 if(!object(snapshot)||!object(selection))return unavailable();
 const {user,record,course,roster,identity,contextKey}=snapshot,sessionId=selection.sessionId;
 if(snapshot.sharedMode!==true||!object(user)||!id(user.id)||!['admin','teacher'].includes(user.role)||typeof identity!=='string'||!identity.trim()||typeof contextKey!=='string'||!contextKey.trim()||!id(sessionId))return unavailable();
 if(!object(record)||record.kind!=='schedule'||!object(record.item)||!id(record.item.id)||!positive(record.sequence)||!date(record.date)||!validClock(record.item)||!positive(record.item.version)||record.cancelled===true||record.item.activityDeleted)return unavailable();
 if(!object(course)||!id(course.id)||course.id!==record.item.course||typeof course.courseName!=='string'||!course.courseName.trim()||course.deletedAt)return unavailable();
 if(!object(roster)||roster.scheduleId!==record.item.id||roster.sequence!==record.sequence)return unavailable();
 if(roster.error)return {status:'error'};if(roster.ready!==true)return {status:'loading'};
 if(!Array.isArray(roster.students))return unavailable();
 const matches=roster.students.filter(row=>object(row)&&row.id===sessionId);if(matches.length!==1)return unavailable();const row=matches[0];
 if(!id(row.studentId)||typeof row.displayName!=='string'||!row.displayName.trim()||row.paymentStatus!=='paid'||roster.students.filter(other=>object(other)&&other.studentId===row.studentId).length!==1)return unavailable();
 const student={id:row.studentId,displayName:row.displayName};
 if(attendanceStates.has(row.attendance))student.attendance=row.attendance;
 if(typeof row.remark==='string')student.remark=row.remark;
 if(typeof row.stickerColor==='string'||row.stickerColor===null)student.stickerColor=row.stickerColor;
 if(typeof row.showRemark==='boolean')student.showRemark=row.showRemark;
 const details=object(row.studentDetails)&&row.studentDetails.studentId===row.studentId?row.studentDetails:null;
 const age=details?.age;
 if(object(age)&&Number.isSafeInteger(age.years)&&age.years>=0&&Number.isInteger(age.months)&&age.months>=0&&age.months<12&&date(age.asOf))student.age={years:age.years,months:age.months,asOf:age.asOf};
 const balance=details?.balance;
 if(object(balance)&&balance.courseId===course.id&&['minutes','visits'].includes(balance.unit)&&Number.isFinite(balance.remaining)&&balance.remaining>=0){
  student.balance={unit:balance.unit,remaining:balance.remaining};
  if(Number.isFinite(balance.total)&&balance.total>=0)student.balance.total=balance.total;
 }
 const item=record.item,lesson={id:row.id,scheduleId:item.id,sequence:record.sequence,sourceVersion:item.version,courseId:course.id,courseName:course.courseName,date:record.date,time:item.time,duration:item.duration,teacher:typeof item.teacher==='string'?item.teacher:'',room:typeof item.room==='string'?item.room:''};
 if(positive(row.version))lesson.sessionVersion=row.version;
 for(const key of ['teacherIds','roomIds'])if(Array.isArray(item[key])&&item[key].every(id))lesson[key]=[...item[key]];
 const arrangement=row.arrangement,known=object(arrangement)&&(arrangement.status===null&&arrangement.version===0||arrangement.status==='pending'&&positive(arrangement.version));
 const capabilities={review:true,save:row.canRecordAttendance===true&&positive(row.version)&&row.sourceVersion===item.version};
 if(known)capabilities.savePending=row.canSetPending===true&&positive(row.version)&&row.sourceVersion===item.version;
 return {status:'ready',facts:{identity,contextKey,student,lesson,...(known?{arrangement:{status:arrangement.status,version:arrangement.version,createdAt:arrangement.createdAt??null,updatedAt:arrangement.updatedAt??null}}:{}),capabilities,availability:{ready:false,slots:[]}}};
}
