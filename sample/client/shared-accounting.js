// Read-only accounting projection of canonical enrollment orders, never a second ledger.
export function sharedAccountingData(orders=[]){
 const students=new Map(),invoices=[],payments=[];
 for(const order of orders){
  students.set(order.studentId,{id:order.studentId,nameZh:order.studentName,nameEn:order.studentName});
  const number=order.reference||`ORD-${order.id.slice(0,8).toUpperCase()}`,name=(order.items||[]).map(item=>item.courseName||item.feeName).join(' / ');
  invoices.push({id:order.id,number,studentId:order.studentId,date:String(order.createdAt||'').slice(0,10),dueDate:order.dueDate||'',status:order.paymentStatus==='paid'?'paid':order.paymentStatus==='awaiting-payment'?'awaiting-payment':'draft',discount:0,orderPreviewSource:true,sourceVersion:order.version,items:[{nameZh:name,nameEn:name,quantity:1,unitPrice:order.amountCents/100}],notesZh:'資料來自報名訂單及確認收款紀錄。',notesEn:'Based on enrollment orders and confirmed payments.'});
  if(order.paymentStatus==='paid')payments.push({id:`payment-${order.id}`,reference:`PAY-${order.id.slice(0,8).toUpperCase()}`,receiptNumber:`RCPT-${order.id.slice(0,8).toUpperCase()}`,invoiceId:order.id,studentId:order.studentId,date:String(order.paidAt||order.updatedAt||'').slice(0,10),amount:order.amountCents/100,method:order.paymentMethod||'',status:'verified'});
 }
 return {students:[...students.values()],invoices,payments,credits:[]};
}

export function enrollmentReportSummary(orders,ctx){
 const {t,esc}=ctx,paid=orders.filter(order=>order.paymentStatus==='paid'),students=new Map();
 for(const order of paid){if(!students.has(order.studentId))students.set(order.studentId,{name:order.studentName,total:0,orders:0,courses:new Set()});const row=students.get(order.studentId);row.total+=order.amountCents;row.orders++;for(const item of order.items||[])row.courses.add(item.courseName||item.courseId);}
 const money=cents=>new Intl.NumberFormat('en-HK',{style:'currency',currency:'HKD'}).format(cents/100);
 return `<section class="enrollment-report-summary"><h2>${esc(t('報名及收款摘要','Enrollment and payment summary'))}</h2><p>${esc(t(`${students.size} 位已付款學生 · ${paid.length} 張訂單`,`${students.size} paid students · ${paid.length} orders`))} · ${esc(money(paid.reduce((total,row)=>total+row.amountCents,0)))}</p><div class="ops-table-scroll" tabindex="0"><table><thead><tr>${[t('學生','Student'),t('課程','Courses'),t('訂單數目','Orders'),t('已收款','Paid amount')].map(title=>`<th scope="col">${esc(title)}</th>`).join('')}</tr></thead><tbody>${[...students.values()].map(row=>`<tr><td>${esc(row.name)}</td><td>${esc([...row.courses].join(' / '))}</td><td>${row.orders}</td><td>${esc(money(row.total))}</td></tr>`).join('')}</tbody></table></div></section>`;
}
