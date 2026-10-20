import {isTeacherColour} from './teacher-colour-picker.js';
export function createTeacherColourSaver({context,save,accept,errorText=()=> 'Unable to save the colour.'}){
 let busy=false;
 return async function({teacherId,colour,finish=()=>{}}={}){
  const before=context(),resource=before.resources?.find(row=>row.id===teacherId&&row.kind==='teacher');
  if(busy||before.role!=='admin'||!before.identity||!resource||!isTeacherColour(colour)){finish(errorText({code:'COLOUR_UNAVAILABLE'}));return;}
  busy=true;
  const current=()=>{const next=context();return next.identity===before.identity&&next.role==='admin'&&next.generation===before.generation;};
  try{
   const result=await save({representativeColor:colour},resource);
   if(!current())return;
   if(result?.resource?.id!==resource.id||result.resource.representativeColor!==colour||result.resource.version<=resource.version)throw Error('Invalid colour acknowledgement');
   const latest=context().resources?.find(row=>row.id===resource.id);
   if(!latest||latest.version>result.resource.version)throw Object.assign(Error('Teacher details changed'),{code:'VERSION_CONFLICT'});
   accept(result.resource);finish();
  }catch(error){if(current())finish(errorText(error));}
  finally{busy=false;}
 };
}
