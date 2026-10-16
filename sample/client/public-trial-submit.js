// One reviewed submission owns one immutable payload/key until its result is
// known. An uncertain retry is a receipt lookup, even if its own hold filled
// the last seat. Route and identity validity remain the host's responsibility.
export function createPublicTrialSubmission(overlay,{isCurrent,canSubmit,newKey,send,changed,errorText}) {
  let pending=false,attempt=null;
  return async function submit(){
    const model=overlay.model;
    if(!isCurrent()||pending||model.submission||model.stale||model.step!=='review'||!model.uncertain&&!canSubmit(model))return;
    if(!attempt)attempt={key:newKey(),input:{courseId:overlay.courseId,slotId:overlay.slotId,from:overlay.from,days:overlay.rangeDays,revision:overlay.revision,applicant:{...model.draft}}};
    pending=true;overlay.model={...model,busy:true,submitError:''};changed();
    try{
      const ack=await send(attempt.input,attempt.key);
      if(!isCurrent())return;
      if(!ack||Object.keys(ack).sort().join(',')!=='outcome,reference'||ack.outcome!=='received'||typeof ack.reference!=='string'||!ack.reference.trim()||ack.reference.length>100)throw new Error('Invalid trial receipt');
      overlay.model={...overlay.model,busy:false,uncertain:false,submitError:'',submission:{reference:ack.reference,outcome:'received'}};changed();
    }catch(error){
      if(!isCurrent()||error.code==='AUTH_SUPERSEDED')return;
      const uncertain=!error.status||error.status>=500||error.code==='service_unavailable'&&error.status>=200&&error.status<300;
      overlay.model={...overlay.model,busy:false,uncertain,stale:!uncertain,submitError:errorText(error,{uncertain})};changed();
    }finally{pending=false;}
  };
}
