// Keep status writes versioned, and discard responses belonging to an old session.
export function createAvailabilityStatusSaver({context,save,accept,errorText}){
 let busy=false;
 return async function(id,active){
  const before={...context()},slot=before.records.get(id);
  if(busy||!before.allowed||!before.identity||!slot||typeof active!=='boolean'||slot.active===active)return;
  busy=true;
  const current=()=>{const next=context();return next.allowed&&next.identity===before.identity&&next.generation===before.generation;};
  try{
   const result=await save({active},slot);
   if(!current())return;
   if(result?.slot?.id!==id||result.slot.active!==active||!Number.isSafeInteger(result.slot.version)||result.slot.version<=slot.version)throw Error('Invalid status acknowledgement');
   const latest=context().records.get(id);
   if(!latest||latest.version>result.slot.version)throw Object.assign(Error('Slot changed'),{code:'VERSION_CONFLICT',status:409});
   accept(result.slot);
  }catch(error){if(current()&&error.code!=='AUTH_SUPERSEDED')errorText(error);}
  finally{busy=false;}
 };
}
export function installAvailabilityStatusMenu({context,toggle,t,document:doc=document}){
 let menu=null,opener=null;
 function close(focus=false){menu?.remove();menu=null;if(focus&&opener?.isConnected)opener.focus({preventScroll:true});opener=null;}
 function open(event,keyboard=false){
  const target=event.target.closest?.('.availability-timetable-slot[data-slot-id],.availability-timetable-row [data-slot-id]'),state=context(),slot=target&&state.records.get(target.dataset.slotId);
  if(!target||!slot||!state.allowed)return;
  event.preventDefault();event.stopPropagation();close();opener=target;
  menu=doc.createElement('div');menu.className='availability-status-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',t('可約時段','Available time'));
  const action=doc.createElement('button');action.type='button';action.setAttribute('role','menuitem');action.textContent=slot.active?t('停用','Inactive'):t('啟用','Active');
  action.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();close(true);const now=context();if(now.identity===state.identity&&now.generation===state.generation)toggle(slot.id,!slot.active);});
  menu.append(action);doc.body.append(menu);
  const rect=target.getBoundingClientRect(),view=doc.defaultView,x=keyboard?rect.left:event.clientX,y=keyboard?rect.top:event.clientY;
  menu.style.left=Math.max(8,Math.min(x,view.innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,view.innerHeight-menu.offsetHeight-8))+'px';action.focus({preventScroll:true});
 }
 doc.addEventListener('contextmenu',event=>open(event),true);
 doc.addEventListener('keydown',event=>{if(menu&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true);}else if(menu&&event.key==='Tab'){close();}else if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')open(event,true);},true);
 doc.addEventListener('pointerdown',event=>{if(menu&&!menu.contains(event.target))close();},true);
 doc.addEventListener('scroll',()=>close(),true);
 doc.defaultView.addEventListener('resize',()=>close());
}
