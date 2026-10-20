export const AVAILABLE_TIME_COLOUR='#27777b';
export const teacherColourChoices=Object.freeze([
 ['#426ea8','湖藍','Lake blue'],['#b9772f','銅橙','Copper'],['#a85563','玫瑰','Rose'],['#a6653b','赤陶','Terracotta'],['#a38a36','金黃','Gold'],
 ['#728e40','橄欖','Olive'],['#4e8a60','草綠','Leaf green'],['#4a9b82','薄荷','Mint'],['#4a9bab','天藍','Sky blue'],['#6279b8','靛藍','Indigo'],
 ['#7d63aa','紫羅蘭','Violet'],['#a35b93','蘭紫','Orchid'],['#b16b85','粉紅','Pink'],['#bb6853','珊瑚','Coral'],['#878344','卡其','Khaki'],
 ['#64846c','鼠尾草','Sage'],['#6a7d91','灰藍','Slate blue'],['#7e6e94','淡紫','Mauve'],['#8f795e','木棕','Wood brown'],['#847882','暖灰','Warm grey']
].map(([value,zh,en])=>Object.freeze({value,zh,en})));
export const isTeacherColour=value=>teacherColourChoices.some(row=>row.value===String(value||'').toLowerCase());
export function teacherColourPickerMarkup({value='',teacherId='',form=false,disabled=false}={}, {t,esc}){
 const colour=/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():'';
 const label=t('選擇代表顏色','Choose representative colour');
 return `<details class="teacher-palette"${teacherId?` data-teacher-id="${esc(teacherId)}"`:''}><summary aria-label="${esc(label)}" aria-disabled="${disabled?'true':'false'}"><span class="teacher-palette-current"${colour?` style="--teacher-choice:${colour}"`:''} aria-hidden="true"></span><span>${esc(t('選擇顏色','Choose colour'))}</span></summary>${form?`<input id="resource-representative-color" type="hidden" name="representativeColor" value="${colour||teacherColourChoices[0].value}"${disabled?' disabled':''}>`:''}<div class="teacher-palette-panel" role="group" aria-label="${esc(t('20 種老師代表色','20 teacher colours'))}"><div class="teacher-palette-grid">${teacherColourChoices.map(row=>`<button type="button" class="teacher-palette-choice" data-teacher-colour="${row.value}" style="--teacher-choice:${row.value}" aria-label="${esc(t(row.zh,row.en))}" title="${esc(t(row.zh,row.en))}" aria-pressed="${colour===row.value?'true':'false'}"${disabled?' disabled':''}><span aria-hidden="true">${colour===row.value?'✓':''}</span></button>`).join('')}</div><p class="teacher-palette-error" role="alert" hidden></p></div></details>`;
}
export function installTeacherColourPicker(doc){
 doc.addEventListener('toggle',event=>{
  const root=event.target;if(!root.matches?.('.teacher-palette')||!root.open)return;
  const panel=root.querySelector('.teacher-palette-panel');panel.style.setProperty('--palette-shift','0px');panel.style.top='';panel.style.bottom='';
  const rect=panel.getBoundingClientRect(),width=doc.documentElement.clientWidth;let shift=Math.min(0,width-16-rect.right);if(rect.left+shift<16)shift=16-rect.left;panel.style.setProperty('--palette-shift',`${shift}px`);
  let bottom=doc.defaultView.innerHeight-16,top=16;for(let parent=root.parentElement;parent;parent=parent.parentElement){const css=doc.defaultView.getComputedStyle(parent);if(/auto|scroll|hidden/.test(css.overflowY)){const bounds=parent.getBoundingClientRect();bottom=Math.min(bottom,bounds.bottom-8);top=Math.max(top,bounds.top+8);}}
  if(rect.bottom>bottom&&root.getBoundingClientRect().top-rect.height-6>top){panel.style.top='auto';panel.style.bottom='calc(100% + 6px)';}
 },true);
 doc.addEventListener('click',event=>{
  for(const other of doc.querySelectorAll('.teacher-palette[open]'))if(!other.contains(event.target))other.open=false;
  const root=event.target.closest?.('.teacher-palette');if(!root)return;
  if(root.querySelector('summary')?.getAttribute('aria-disabled')==='true'){event.preventDefault();return;}
  const choice=event.target.closest('[data-teacher-colour]');if(!choice||choice.disabled)return;
  const colour=choice.dataset.teacherColour;if(!isTeacherColour(colour))return;
  const input=root.querySelector('input[name="representativeColor"]');
  const finish=error=>{
   if(!root.isConnected)return;
   root.removeAttribute('aria-busy');root.querySelectorAll('[data-teacher-colour]').forEach(button=>button.disabled=false);
   const message=root.querySelector('.teacher-palette-error');message.textContent=error||'';message.hidden=!error;
   if(error)return;
   root.querySelector('.teacher-palette-current').style.setProperty('--teacher-choice',colour);
   root.querySelectorAll('[data-teacher-colour]').forEach(button=>{const selected=button.dataset.teacherColour===colour;button.setAttribute('aria-pressed',String(selected));button.querySelector('span').textContent=selected?'✓':'';});
   root.open=false;root.querySelector('summary').focus({preventScroll:true});
  };
  if(input){input.value=colour;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));finish();return;}
  root.setAttribute('aria-busy','true');root.querySelectorAll('[data-teacher-colour]').forEach(button=>button.disabled=true);
  doc.dispatchEvent(new CustomEvent('beamal-teacher-colour',{detail:{teacherId:root.dataset.teacherId,colour,finish}}));
 });
 doc.addEventListener('change',event=>{
  if(event.target.id!=='resource-color-enabled')return;
  const root=event.target.closest('form')?.querySelector('.teacher-palette');if(!root)return;
  const disabled=!event.target.checked;root.querySelector('summary').setAttribute('aria-disabled',String(disabled));root.querySelectorAll('input,button').forEach(node=>node.disabled=disabled);if(disabled)root.open=false;
 });
 doc.addEventListener('keydown',event=>{const root=event.target.closest?.('.teacher-palette[open]');if(event.key==='Escape'&&root){event.preventDefault();event.stopImmediatePropagation();root.open=false;root.querySelector('summary').focus({preventScroll:true});}},true);
}
if(typeof document!=='undefined'&&document.addEventListener)installTeacherColourPicker(document);
