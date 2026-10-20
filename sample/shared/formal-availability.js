// A schedule snapshots these defaults. Per-occurrence saved slots take priority.
export function formalAvailabilityPolicy(value,{regular=false}={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['trialEnabled','trialCapacity','reschedulingEnabled','reschedulingCapacity',...(regular?['regularCapacity']:[])].includes(key)))throw Error('Invalid lesson availability settings.');
 const result={};
 if(regular){if(!Number.isSafeInteger(value.regularCapacity)||value.regularCapacity<1||value.regularCapacity>10000)throw Error('Choose regular capacity from 1 to 10000.');result.regularCapacity=value.regularCapacity;}
 for(const purpose of ['trial','rescheduling']){
  if(typeof value[purpose+'Enabled']!=='boolean')throw Error('Choose whether this lesson accepts trial and rescheduling students.');
  const capacity=value[purpose+'Capacity'];
  if(!Number.isSafeInteger(capacity)||capacity<0||capacity>10000||value[purpose+'Enabled']&&capacity<1)throw Error('Enabled purposes require a positive capacity up to 10000.');
  result[purpose+'Enabled']=value[purpose+'Enabled'];result[purpose+'Capacity']=value[purpose+'Enabled']?capacity:0;
 }
 return result;
}
export const formalTotalCapacity=(regular,policy)=>Number.isSafeInteger(regular)?regular+(policy?.trialEnabled?policy.trialCapacity:0)+(policy?.reschedulingEnabled?policy.reschedulingCapacity:0):null;
export const formalSlotId=(id,sequence)=>'formal:'+id+':'+sequence;
export function parseFormalSlotId(id){const match=typeof id==='string'&&/^formal:(.+):([1-9]\d*)$/.exec(id);return match&&Number.isSafeInteger(Number(match[2]))?{scheduleId:match[1],sequence:Number(match[2])}:null;}
