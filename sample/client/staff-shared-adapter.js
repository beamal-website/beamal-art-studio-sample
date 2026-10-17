// Translate authorized service DTOs into staff views without creating a second
// roster or inferring account identity from names or email addresses.
import {sessionIdentityKey} from './session-identity.js';
const rows=value=>Array.isArray(value)?value.filter(row=>row&&typeof row==='object'):[];
const ids=value=>Array.isArray(value)?value.filter(id=>typeof id==='string'):[];
const endTime=(time,duration)=>{
  if(!/^\d{2}:\d{2}$/.test(time||'')||!Number.isFinite(duration))return '';
  const minutes=Number(time.slice(0,2))*60+Number(time.slice(3))+duration;
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
};
const rosterFor=(rosters,key)=>rosters instanceof Map?rosters.get(key):rosters?.[key];
const nameOf=course=>course?.courseName||course?.displayName||{zh:'課程資料未提供',en:'Course details unavailable'};

export function staffSharedState(previous={},snapshot={}){
  const user=snapshot.user||{},identity=sessionIdentityKey(user);
  const retain=previous.shared===true&&previous.sharedIdentity===identity;
  const ui=retain?previous:{};
  const authorized=['admin','teacher'].includes(user.role)&&typeof user.id==='string'&&!!user.id.trim();
  const sourceReady=snapshot.ready===true&&authorized;
  // The service, not a previous browser screen, decides whether its saved
  // snapshot is still authorized. A matching identity alone is insufficient.
  const saved=authorized&&retain&&previous.sharedReady===true&&snapshot.hasSavedData===true;
  const ready=sourceReady||saved,loading=authorized&&(snapshot.loading===true||snapshot.loading===undefined&&!sourceReady&&!snapshot.error);
  const sharedError=authorized&&snapshot.error?String(snapshot.error):'';
  const studentRequestTasks=user.role==='admin'&&snapshot.studentRequestsReady===true?rows(snapshot.studentRequests).map(request=>({
    id:request.id,requestId:request.id,requestVersion:request.version,studentId:request.studentId,studentName:request.studentName,courseName:request.lesson?.courseName||'',availableTimes:Array.isArray(request.availableTimes)?request.availableTimes:[],assigning:request.assigning===true,
    title:{zh:`${request.type==='sick'?'病假':'調課'}申請 · ${request.lesson?.courseName||'課堂'}`,en:`${request.type==='sick'?'Sick leave':'Rescheduling'} request · ${request.lesson?.courseName||'Lesson'}`},
    detail:{zh:`課堂：${request.lesson?.date||'—'} ${request.lesson?.time||''}${request.preferredDate?` · 希望日期：${request.preferredDate}`:''}${request.reason?` · 原因：${request.reason}`:''}`,en:`Lesson: ${request.lesson?.date||'—'} ${request.lesson?.time||''}${request.preferredDate?` · Preferred date: ${request.preferredDate}`:''}${request.reason?` · Reason: ${request.reason}`:''}`},
    due:request.lesson?.date||request.createdAt?.slice(0,10)||'',scheduleId:request.scheduleId,sequence:request.sequence,requestType:request.type
  })):[],
  studentRequestsTodo={id:'student-requests',title:{zh:'學生課堂申請',en:'Student lesson requests'},tasks:studentRequestTasks};
  const resources=sourceReady?rows(snapshot.resources):[],courses=new Map(rows(snapshot.courses).map(course=>[course.id,course]));
  const links=sourceReady?rows(snapshot.teacherLinks):[],accounts=new Map(rows(snapshot.accounts).map(account=>[account.id,account]));
  if(user.id)accounts.set(user.id,{...accounts.get(user.id),...user});
  const resourceMap=new Map(resources.map(resource=>[resource.id,resource]));
  // A present authenticated self list is authoritative, including an empty or
  // unusable value. Older management snapshots cannot restore a revoked link.
  const hasSelfIds=Object.hasOwn(user,'teacherResourceIds');
  const ownIds=hasSelfIds?ids(user.teacherResourceIds):links.filter(link=>link.userId===user.id).map(link=>link.teacherResourceId);
  const ownResources=new Set(ownIds.filter(id=>resourceMap.get(id)?.kind==='teacher'));
  const personalReady=sourceReady&&snapshot.staffProfileReady===true;
  const personalResources=new Set(resources.filter(resource=>resource.kind==='teacher'&&resources.filter(other=>other.id===resource.id).length===1).map(resource=>resource.id));
  const personalRecords=personalReady?rows(snapshot.staffProfileRecords).filter(record=>personalResources.has(record.staffId)&&(user.role==='admin'||ownResources.has(record.staffId))):[];
  const personalFor=id=>{
    const matches=personalRecords.filter(record=>record.staffId===id),record=matches.length===1?matches[0]:null;
    const status=user.role!=='admin'&&!ownResources.has(id)?'unavailable':matches.length>1?'ambiguous':record?'ready':snapshot.staffProfileLoading===true?'loading':snapshot.staffProfileError?'error':personalReady?'empty':'unavailable';
    const value=key=>typeof record?.[key]==='string'?record[key]:'';
    return {position:value('position')||{zh:'職位暫未提供',en:'Position unavailable'},employment:record&&typeof record.employment==='string'?record.employment:undefined,contactEmail:value('contactEmail'),phone:value('phone'),mobile:value('mobile'),joined:value('joined'),personalSourceStatus:status,personalSourceLoading:snapshot.staffProfileLoading===true,personalSourceError:!!snapshot.staffProfileError};
  };
  const occurrences=sourceReady?rows(snapshot.occurrences).filter(row=>row.item&&typeof row.item.id==='string'&&Number.isSafeInteger(row.sequence)&&row.sequence>0&&!row.cancelled&&!row.item.activityDeleted):[];
  const staff=sourceReady?resources.filter(resource=>resource.kind==='teacher').map(resource=>{
    const own=ownResources.has(resource.id),link=links.find(item=>item.teacherResourceId===resource.id&&(!hasSelfIds||item.userId!==user.id||own));
    const linkedUserId=own?user.id:link?.userId||null,account=accounts.get(linkedUserId);
    const courseIds=[...new Set(occurrences.filter(row=>ids(row.item.teacherIds).includes(resource.id)).map(row=>row.item.course))];
    return {...resource,...personalFor(resource.id),id:resource.id,userId:linkedUserId||null,accountId:linkedUserId||null,accountName:account?.displayName||'',accountRole:account?.role||null,accountLinkKnown:user.role==='admin'||!!link||ownResources.has(resource.id),displayName:resource.displayName,email:account?.email??'',role:account?.role==='admin'?'admin':'teacher',teaching:true,courses:courseIds.map(id=>nameOf(courses.get(id))),shared:true};
  }):saved?rows(previous.staff):[];
  const authorizedOccurrences=occurrences.filter(row=>user.role==='teacher'||ids(row.item.teacherIds).some(id=>ownResources.has(id)));
  const classes=sourceReady?authorizedOccurrences.map(row=>{
    const {item,sequence,date}=row,key=`${item.id}:${sequence}`,roster=rosterFor(snapshot.rosters,key),rosterReady=!!roster&&roster.ready!==false&&!roster.error;
    const students=rosterReady?rows(roster.students).filter(student=>typeof student.studentId==='string').map(student=>({...student,id:student.studentId,sessionId:student.id})):[];
    return {id:key,scheduleId:item.id,sequence,staffId:user.id,teacherIds:ids(item.teacherIds),date,time:item.time,endTime:endTime(item.time,item.duration),duration:item.duration,courseId:item.course,courseName:nameOf(courses.get(item.course)),room:ids(item.roomIds).map(id=>resourceMap.get(id)?.displayName).filter(Boolean).join(' · ')||item.room||'',students,occupied:rosterReady?(Number.isFinite(roster.occupied)?roster.occupied:students.length):null,capacity:roster?.capacity??item.capacity??null,rosterReady,rosterError:roster?.error||'',shared:true};
  }).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time).localeCompare(String(b.time))||a.id.localeCompare(b.id)):saved?rows(previous.classes):[];
  return {
    ...ui,shared:true,sharedIdentity:identity,sharedReady:ready,sharedSourceReady:sourceReady,sharedLoading:loading,sharedError,sharedStale:ready&&!!sharedError&&!loading,
    today:snapshot.today||'',currentTime:snapshot.currentTime||'',viewerId:user.id||'',viewer:{...user,id:user.id||'',displayName:user.displayName||'',teacherResourceIds:saved&&!sourceReady?ids(previous.viewer?.teacherResourceIds):[...ownResources]},
    staff,classes,portalTab:ui.portalTab||'home',query:ui.query||'',filter:ui.filter||'active',page:ui.page||1,pageSize:ui.pageSize||20,
    dialog:ready?ui.dialog||null:null,notice:ui.notice||'',error:ui.error||'',staffDrafts:{},
    todos:user.role==='admin'&&snapshot.studentRequestsReady===true?[studentRequestsTodo]:[],todosReady:sourceReady&&(user.role!=='admin'||snapshot.studentRequestsReady===true),todosError:sourceReady&&user.role==='admin'?String(snapshot.studentRequestsError||''):'',paymentRequests:[],payrollRows:[],payrollReady:false,clockEntries:ui.clockEntries||[],clockReady:false,leaveRequests:ui.leaveRequests||[],clockedIn:ui.clockedIn||false,
    leaveRecords:sourceReady&&snapshot.leaveReady===true?rows(snapshot.leaveRecords):[],leaveReady:sourceReady&&snapshot.leaveReady===true,leaveLoading:authorized&&snapshot.leaveLoading===true,leaveError:authorized&&snapshot.leaveError?String(snapshot.leaveError):'',
    leaveSessions:sourceReady&&snapshot.leaveSessionsReady===true?rows(snapshot.leaveSessions):[],leaveSessionsReady:sourceReady&&snapshot.leaveSessionsReady===true,
    leaveBalances:sourceReady&&snapshot.leaveBalancesReady===true&&snapshot.leaveBalances&&typeof snapshot.leaveBalances==='object'&&!Array.isArray(snapshot.leaveBalances)?snapshot.leaveBalances:{},leaveBalancesReady:sourceReady&&snapshot.leaveBalancesReady===true,
    workRosterRecords:sourceReady&&snapshot.workRosterReady===true?rows(snapshot.workRosterRecords):[],workRosterReady:sourceReady&&snapshot.workRosterReady===true,workRosterLoading:authorized&&snapshot.workRosterLoading===true,workRosterError:authorized&&snapshot.workRosterError?String(snapshot.workRosterError):'',
    workRosterGroups:sourceReady&&snapshot.workRosterGroupsReady===true&&snapshot.workRosterGroups&&typeof snapshot.workRosterGroups==='object'&&!Array.isArray(snapshot.workRosterGroups)?snapshot.workRosterGroups:{},workRosterGroupsReady:sourceReady&&snapshot.workRosterGroupsReady===true,
    calendarSharingRecords:sourceReady&&snapshot.calendarSharingReady===true?rows(snapshot.calendarSharingRecords):[],calendarSharingReady:sourceReady&&snapshot.calendarSharingReady===true,calendarSharingLoading:authorized&&snapshot.calendarSharingLoading===true,calendarSharingError:authorized&&snapshot.calendarSharingError?String(snapshot.calendarSharingError):'',
    staffProfileRecords:personalRecords,staffProfileReady:personalReady,staffProfileLoading:authorized&&snapshot.staffProfileLoading===true,staffProfileError:authorized&&snapshot.staffProfileError?String(snapshot.staffProfileError):'',
  };
}
