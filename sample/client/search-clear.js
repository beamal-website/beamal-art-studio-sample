// Search fields keep their own filtering logic. Clearing follows the same input
// and search action as a normal search, without submitting surrounding editors.
export const searchFieldSelector='input[type="search"],input[name="search"],input#search,input#pmt-query';

const searchForms=new Set(['people-search','portal-course-search','fee-search-form','lead-search-form','timetable-search','timetable-resource-search','scheduling-resource-search','template-search','student-record-search','ui-accounting-reference-filter']);

export function applyClearedSearch(input){
  if(!input||input.disabled||input.readOnly)return false;
  const form=input.form;
  const scope=input.closest('.ops-filters,.sr-find-student');
  const action=scope?.querySelector('[data-ui-command="apply-filters"],[data-action="sr-find-student"]');
  input.value='';
  input.dispatchEvent(new Event('input',{bubbles:true}));
  // Live searches may already replace the input during the input event.
  if(input.isConnected){
    input.dispatchEvent(new Event('change',{bubbles:true}));
    if(action&&!action.disabled&&action.isConnected)action.click();
    else if(form?.isConnected&&(searchForms.has(form.id)||form.matches('.ops-accounting-filters')))form.requestSubmit();
  }
  return true;
}

export function installSearchClear(doc){
  const win=doc.defaultView;
  const label=()=>doc.documentElement.lang.startsWith('zh')?'清除搜尋':'Clear search';
  const sync=input=>{
    if(!input.matches(searchFieldSelector))return;
    let wrapper=input.parentElement;
    if(!wrapper?.classList.contains('search-clear-field')){
      const focused=doc.activeElement===input,start=input.selectionStart,end=input.selectionEnd;
      wrapper=doc.createElement('span');
      wrapper.className='search-clear-field';
      input.before(wrapper);wrapper.append(input);
      const button=doc.createElement('button');
      button.type='button';button.className='search-clear-button';
      button.textContent='×';
      wrapper.append(button);
      if(focused){input.focus({preventScroll:true});if(start!==null)input.setSelectionRange(start,end);}
      button.addEventListener('click',()=>{
        const id=input.id,name=input.name,formId=input.form?.id,command=input.dataset.uiCommand;
        applyClearedSearch(input);
        syncAll();
        // Restore focus even when a live search redraws its field.
        const next=input.isConnected?input:[...doc.querySelectorAll(searchFieldSelector)].find(node=>id?node.id===id:name&&node.name===name&&(!formId||node.form?.id===formId)||!id&&!name&&command&&node.dataset.uiCommand===command);
        next?.focus({preventScroll:true});
      });
    }
    const button=wrapper.querySelector('.search-clear-button');
    button.hidden=!input.value||input.disabled||input.readOnly;
    button.setAttribute('aria-label',label());button.title=label();
    wrapper.classList.toggle('has-search-value',!button.hidden);
  };
  const syncAll=()=>doc.querySelectorAll(searchFieldSelector).forEach(sync);
  doc.addEventListener('input',event=>{if(event.target.matches?.(searchFieldSelector)&&event.target.isConnected)sync(event.target);});
  doc.addEventListener('search',event=>{if(event.target.matches?.(searchFieldSelector)&&!event.target.value)applyClearedSearch(event.target);});
  // Covers full-page renders, dynamically opened dialogs, and language changes.
  const observer=new win.MutationObserver(records=>{
    if(records.some(record=>record.type==='childList'&&[...record.addedNodes].some(node=>node.nodeType===1&&!node.classList.contains('search-clear-button')&&!node.classList.contains('search-clear-field'))||record.type==='attributes'))syncAll();
  });
  observer.observe(doc.body,{childList:true,subtree:true});
  observer.observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
  syncAll();
  return ()=>observer.disconnect();
}

if(typeof document!=='undefined'&&document.defaultView?.MutationObserver)installSearchClear(document);
