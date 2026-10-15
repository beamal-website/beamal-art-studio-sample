// The authenticated person's own teacher links can change without an admin's
// general access revision changing. They form part of the client identity too.
export function sessionIdentityKey(user={}){
  const self=Object.hasOwn(user||{},'teacherResourceIds')
    ?[...new Set((Array.isArray(user.teacherResourceIds)?user.teacherResourceIds:[]).filter(id=>typeof id==='string'&&id.trim()))].sort()
    :null;
  return JSON.stringify([user?.id||'',user?.role||'',user?.accessRevision||'',self]);
}
