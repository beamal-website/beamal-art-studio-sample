const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function orderPackageSummaryMarkup(item, {paymentStatus = ''} = {}, context = {}) {
  const t = context.t || ((_zh, en) => en), esc = context.esc || escape;
  const pricing = item?.pricing, lessons = item?.lessons, unknown = t('未提供', 'Not provided');
  const quotaLabel = paymentStatus === 'paid' ? t('原購額度', 'Original purchased quota') : t('訂單列示額度', 'Quota on this order');
  let quota = unknown;
  if (pricing?.pricingModel === 'package') {
    if (Number.isSafeInteger(pricing.packageTotal) && pricing.packageTotal > 0 && ['minutes', 'visits', 'lessons'].includes(pricing.packageType)) {
      const total = pricing.packageTotal;
      const unit = pricing.packageType === 'minutes' ? t('分鐘', total === 1 ? 'minute' : 'minutes') : t('次', total === 1 ? 'visit' : 'visits');
      quota = `${total} ${unit}`;
    }
  } else if (['monthly-lessons', 'per-lesson', 'fixed-monthly'].includes(pricing?.pricingModel)) quota = t('不適用', 'Not applicable');
  const selected = Array.isArray(lessons) ? `${lessons.length} ${t('堂', lessons.length === 1 ? 'lesson' : 'lessons')}` : unknown;
  return `<dl class="order-package-summary" data-order-package-summary data-course-id="${esc(item?.courseId || '')}" data-fee-id="${esc(item?.feeId || '')}" aria-label="${esc(t('方案摘要', 'Package summary'))}"><dt>${quotaLabel}</dt><dd>${quota}</dd><dt>${t('本單所選課堂', 'Selected lessons on this order')}</dt><dd>${selected}</dd><dt>${t('剩餘額度', 'Remaining balance')}</dt><dd>${unknown}</dd><dt>${t('有效期間', 'Validity period')}</dt><dd>${unknown}</dd><dt>${t('組合內容', 'Package contents')}</dt><dd>${unknown}</dd></dl>`;
}
