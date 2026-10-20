// Counts current authorized pending work, never historical notification events.
export function workspacePendingCounts({identity,trial,arrangements,available,requests}={}){
 const counts={rescheduling:0,trial:0,payment:0,other:0};if(!identity)return counts;
 const current=cache=>cache?.identity===identity&&cache.ready===true&&!cache.error;
 const count=value=>Number.isSafeInteger(value)&&value>0?value:0;
 counts.trial=current(trial)?count(trial.pendingTotal):0;
 counts.other=(current(arrangements)?count(arrangements.total):0)+(current(available)&&Array.isArray(available.slots)?available.slots.length:0);
 if(current(requests)&&Array.isArray(requests.requests))for(const row of requests.requests)if(['pending','reviewing'].includes(row.status))counts[row.type==='sick'?'other':'rescheduling']++;
 return counts;
}
export const workspacePendingCount=input=>Object.values(workspacePendingCounts(input)).reduce((total,value)=>total+value,0);
