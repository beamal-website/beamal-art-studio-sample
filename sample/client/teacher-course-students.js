const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function createTeacherCourseStudents({api,context,repaint}){
 let identity='',generation=0,cache=new Map();
 const sync=()=>{const current=context();if(identity!==current.identity){identity=current.identity;generation++;cache=new Map();}return current;};
 async function refresh(force=false){
  const current=sync(),id=current.courseId;if(!current.enabled||!id)return;
  const previous=cache.get(id);if(previous?.loading||!force&&previous)return;
  const ticket=generation;cache.set(id,{...previous,loading:true,error:''});
  try{const result=await api.courseStudents(id);if(ticket!==generation||sync().identity!==current.identity||ticket!==generation)return;
   if(result.courseId!==id||!Array.isArray(result.students)||result.students.some(row=>typeof row.id!=='string'||typeof row.displayName!=='string'))throw new Error('Invalid student roster');
   cache.set(id,{students:result.students,loading:false,error:''});
  }catch{if(ticket!==generation||sync().identity!==current.identity||ticket!==generation)return;cache.set(id,{loading:false,error:true});}
  if(context().courseId===id&&context().enabled)repaint();
 }
 function markup(){const current=sync();if(!current.enabled)return '';refresh();const state=cache.get(current.courseId)||{loading:true},t=current.t;
  return `<section class="course-detail-card teacher-course-students"><h2>${t('學生','Students')}</h2>${state.error?`<p role="alert">${t('未能載入學生名單，請稍後重試。','Could not load students. Please retry shortly.')}</p>`:state.loading&&!state.students?`<p role="status">${t('正在載入…','Loading…')}</p>`:state.students?.length?`<div class="table-wrap"><table><thead><tr><th>${t('學生姓名','Student name')}</th></tr></thead><tbody>${state.students.map(row=>`<tr><td>${escape(row.displayName)}</td></tr>`).join('')}</tbody></table></div>`:`<p>${t('暫未有學生。','No students yet.')}</p>`}</section>`;
 }
 return {markup,refresh};
}
