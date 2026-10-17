const courseCount=6,teacherCount=4,roomCount=6,occurrencesPerClass=3;
const timeBuckets=['09:00','10:15','11:30','13:00','14:15','15:30'];
const firstDate='2026-10-16';
const addDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
function validateStudentCount(value){if(!Number.isSafeInteger(value)||value<6||value>3000||value%courseCount!==0)throw new Error('Student count must be a multiple of six from 6 to 3000.');return value;}
function validateCapacity(value){if(!Number.isSafeInteger(value)||value<1)throw new Error('Class capacity must be a positive safe whole number.');return value;}

export function parseEnrollmentScaleArgs(args=[]){
 if(!Array.isArray(args)||args.length%2!==0)throw new Error('Use [--students a-multiple-of-six] [--class-capacity a-positive-integer].');
 let studentCount=300,classCapacity;const seen=new Set();
 for(let index=0;index<args.length;index+=2){
  const name=args[index],raw=args[index+1];if(!['--students','--class-capacity'].includes(name)||seen.has(name)||typeof raw!=='string'||!raw)throw new Error('Use each supported scale option at most once with a value.');seen.add(name);
  if(name==='--students')studentCount=validateStudentCount(Number(raw));
  else {if(!/^[1-9]\d*$/.test(raw))throw new Error('Class capacity must be a positive whole number.');classCapacity=validateCapacity(Number(raw));}
 }
 return {studentCount:validateStudentCount(studentCount),classCapacity};
}

export function buildEnrollmentScalePlan({studentCount=300,classCapacity}={}){
 validateStudentCount(studentCount);const legacy=classCapacity===undefined,perCourse=studentCount/courseCount,capacity=legacy?perCourse:validateCapacity(classCapacity),classesPerCourse=Math.ceil(perCourse/capacity),classCount=classesPerCourse*courseCount;
 // This fixture uses six real one-hour daily buckets with 15-minute gaps.
 // It must fit one week before its three weekly repetitions start repeating.
 if(!legacy&&classCount>teacherCount*timeBuckets.length*7)throw new Error('The requested small-class fixture does not fit one resource-safe weekly schedule; use more capacity or fewer Students.');
 const classes=[],students=Array(studentCount);
 for(let courseIndex=0;courseIndex<courseCount;courseIndex++)for(let localClassIndex=0;localClassIndex<classesPerCourse;localClassIndex++){
  const index=classes.length,bucket=Math.floor(index/teacherCount),dayOffset=legacy?0:Math.floor(bucket/timeBuckets.length),time=legacy?timeBuckets[courseIndex]:timeBuckets[bucket%timeBuckets.length],studentIndices=[];
  for(let position=localClassIndex*capacity;position<Math.min((localClassIndex+1)*capacity,perCourse);position++)studentIndices.push(position*courseCount+courseIndex);
  const group={id:`course-${courseIndex}-class-${localClassIndex}`,courseIndex,classIndex:localClassIndex,teacherIndex:index%teacherCount,roomIndex:index%roomCount,startDate:addDays(firstDate,dayOffset),weekday:(5+dayOffset)%7,time,duration:60,capacity,studentIndices};
  classes.push(group);for(const studentIndex of studentIndices)students[studentIndex]={studentIndex,courseIndex,classId:group.id};
 }
 return {studentCount,courseCount,teacherCount,roomCount,classCapacity:capacity,occurrencesPerClass,classes,students};
}
