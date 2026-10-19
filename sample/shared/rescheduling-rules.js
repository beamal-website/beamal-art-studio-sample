// The same source and student gates apply to discovery and final placement.
export function normalizedReschedulingRules(slot={}){
 return {reschedulingSourceMode:slot.reschedulingSourceMode||'all',allowedSourceCourseIds:slot.allowedSourceCourseIds||[],allowedSourceScheduleIds:slot.allowedSourceScheduleIds||[],studentAccessMode:slot.studentAccessMode||(slot.excludedStudentIds?.length?'blacklist':'all'),studentIds:slot.studentAccessMode?(slot.studentIds||[]):(slot.excludedStudentIds||[])};
}
export function reschedulingRulesAllow(slot,source){
 const rules=normalizedReschedulingRules(slot),listed=rules.studentIds.includes(source.studentId);
 if(rules.studentAccessMode==='whitelist'&&!listed||rules.studentAccessMode==='blacklist'&&listed)return false;
 return rules.reschedulingSourceMode==='all'||rules.allowedSourceCourseIds.includes(source.courseId)||rules.allowedSourceScheduleIds.includes(source.scheduleId);
}
