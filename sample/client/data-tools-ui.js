const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const columnIds=['name','category','level','email','remark'];
const chosenColumns=value=>columnIds.filter(id=>Array.isArray(value)&&value.includes(id));
export function dataToolsMarkup(state={},context={}){
 const t=context.t||((_z,e)=>e),esc=context.esc||escape,importing=state.view==='import',labels={courses:t('課程','courses'),fees:t('費用','fees'),leads:t('潛在客戶','leads'),students:t('學生','students')},entity=labels[state.entity]||t('資料','records');
 const columns=[['name',t('名稱','Name')],['category',t('類別','Category')],['level',t('程度','Level')],['email',t('電郵','Email')],['remark',t('備註','Remark')]];
 const selected=state.columns===undefined?columnIds:chosenColumns(state.columns),format=state.format==='Excel'?'Excel':'CSV',range=state.range==='page'?'page':'filtered';
 const rangeLabel=range==='page'?t('目前頁面','Current page'):t('目前篩選結果','Current filtered results');
 const error=state.error==='columns-required'?t('請至少選擇一個匯出欄位。','Choose at least one column to export.'):state.error||'';
 const command=(action,label)=>`<button type="button" class="ghost" data-action="ui-data-tools" data-ui-command="${action}">${label}</button>`;
 const title=importing?t(`匯入${entity}`,`Import ${entity}`):t(`匯出${entity}`,`Export ${entity}`);
 let body='',footer='';
 if(state.step==='complete'){
  body=`<div class="data-tools-complete"><span aria-hidden="true">✓</span><h3>${t('已完成本次預覽','Preview complete')}</h3><p>${t('你可以返回調整欄位，或關閉視窗。','Go back to adjust the fields or close this window.')}</p></div>`;footer=command('back',t('返回設定','Back to options'))+command('close',t('完成','Done'));
 }else if(state.step==='review'){
  body=`<h3>${t('核對欄位及設定','Review fields and options')}</h3><dl class="data-tools-summary"><div><dt>${t('資料類別','Records')}</dt><dd>${esc(entity)}</dd></div><div><dt>${importing?t('檔案','File'):t('格式','Format')}</dt><dd>${esc(importing?state.filename||t('示例檔案.csv','Example.csv'):format)}</dd></div>${importing?'':`<div><dt>${t('資料範圍','Records to include')}</dt><dd>${esc(rangeLabel)}</dd></div>`}<div><dt>${t('處理方式','Handling')}</dt><dd>${t('僅供介面預覽','Interface preview only')}</dd></div></dl><div class="table-wrap"><table><thead><tr><th>${t('檔案欄位','File column')}</th><th>${t('對應欄位','Mapped field')}</th></tr></thead><tbody>${columns.filter(([id])=>importing||selected.includes(id)).map(([,label])=>`<tr><td>${esc(label)}</td><td>${esc(label)} <span aria-hidden="true">✓</span></td></tr>`).join('')}</tbody></table></div><p class="data-tools-note">${importing?t('請確認欄位內容及重複資料處理方式。','Check the fields and how duplicates should be handled.'):t('請確認已選欄位及資料範圍。','Check the selected columns and record range.')}</p>`;footer=command('back',t('返回修改','Back to edit'))+command('complete',t('完成預覽','Finish preview'));
 }else{
  body=`<form id="ui-data-tools-form"><div class="data-tools-fields">${importing?`<label class="data-tools-upload"><span aria-hidden="true">↑</span><strong>${t('選擇 CSV 或 Excel 檔案','Choose a CSV or Excel file')}</strong><small>${t('預覽不會上載或修改共用資料。','This preview does not upload files or change shared records.')}</small><input name="file" type="file" accept=".csv,.xlsx,.xls"></label><label>${t('遇到重複資料時','When a record already exists')}<select name="duplicates"><option value="skip">${t('略過重複資料','Skip duplicates')}</option><option value="review">${t('逐項核對','Review each record')}</option></select></label>`:`<label>${t('檔案格式','File format')}<select name="format"><option value="CSV" ${format==='CSV'?'selected':''}>CSV</option><option value="Excel" ${format==='Excel'?'selected':''}>Excel (.xlsx)</option></select></label><label>${t('資料範圍','Records to include')}<select name="range"><option value="filtered" ${range==='filtered'?'selected':''}>${t('目前篩選結果','Current filtered results')}</option><option value="page" ${range==='page'?'selected':''}>${t('目前頁面','Current page')}</option></select></label><fieldset${error?' aria-describedby="data-tools-error"':''}><legend>${t('包含欄位','Columns to include')}</legend>${columns.map(([id,label])=>`<label class="data-tools-check"><input type="checkbox" name="column" value="${id}" ${selected.includes(id)?'checked':''}>${label}</label>`).join('')}</fieldset>`}</div>${error?`<p id="data-tools-error" class="data-tools-error" role="alert">${esc(error)}</p>`:''}</form>`;footer=command('close',t('取消','Cancel'))+`<button type="submit" form="ui-data-tools-form">${t('下一步：核對','Next: review')}</button>`;
 }
 return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="data-tools-title"><div class="dialog data-tools-dialog" tabindex="-1"><header><div><small>${t('介面預覽','Interface preview')}</small><h2 id="data-tools-title">${title}</h2></div><button class="ghost" data-action="ui-data-tools" data-ui-command="close" aria-label="${t('關閉','Close')}">×</button></header><div class="data-tools-body">${body}</div><footer>${footer}</footer></div></div>`;
}
export function advanceDataTools(state,command,fields={}){
 if(command==='back')return {...state,step:'edit',error:''};
 if(command==='complete')return {...state,step:'complete',error:''};
 if(command==='review'){
  const next={...state,...fields,error:''};
  if(state.view!=='import'){
   next.columns=chosenColumns(fields.columns??state.columns??columnIds);
   next.format=next.format==='Excel'?'Excel':'CSV';next.range=next.range==='page'?'page':'filtered';
   if(!next.columns.length)return {...next,step:'edit',error:'columns-required'};
  }
  return {...next,step:'review'};
 }
 return state;
}
