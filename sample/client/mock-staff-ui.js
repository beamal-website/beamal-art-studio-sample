import { representativeColour } from './teacher-colour-ui.js';

const rowsOf = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : [];
const availableText = (value, fallback) => typeof value === 'string' && value.trim() ? value : fallback;

function linkedResourcesMarkup(user, links, resources, { t, esc }) {
  const userLinks = links.filter(link => link.userId === user.id);
  if (!userLinks.length) return `<span class="mock-staff-unlinked">${esc(t('未連結', 'Unlinked'))}</span>`;
  return userLinks.map(link => {
    const resource = resources.find(row => row.id === (link.teacherId ?? link.teacherResourceId));
    if (!resource) return `<span class="mock-staff-unlinked">${esc(t('授課資料暫未提供', 'Teaching resource unavailable'))}</span>`;
    const colour = representativeColour(resource.teacherColor ?? resource.representativeColor);
    return `<span class="mock-staff-resource">${colour ? `<span class="mock-staff-swatch" style="--mock-staff-teacher-color:${colour}" aria-hidden="true"></span>` : ''}<span>${esc(availableText(resource.displayName, t('老師名稱暫未提供', 'Teacher name unavailable')))}${resource.active === false ? `<small>${esc(t('授課資料已停用', 'Teaching resource is inactive'))}</small>` : ''}</span></span>`;
  }).join('');
}

export function renderMockStaff({ accessControl = {}, loading = false, error = '' } = {}, { t, esc }) {
  const snapshot = accessControl || {}, users = rowsOf(snapshot.users ?? snapshot.accounts).filter(user => ['admin', 'teacher'].includes(user.role));
  const links = rowsOf(snapshot.links ?? snapshot.teacherLinks), resources = rowsOf(snapshot.resources);
  return `<section class="mock-staff-page" aria-labelledby="mock-staff-title" aria-busy="${loading ? 'true' : 'false'}">
    <header class="portal-page-heading mock-staff-heading"><h1 id="mock-staff-title">${esc(t('員工', 'Staff'))}</h1><button type="button" data-action="staff-resources-open"${loading ? ' disabled' : ''}>${esc(t('管理老師及課室', 'Manage teachers and rooms'))}</button></header>
    <div class="mock-staff-body"><p class="mock-staff-note">${esc(t('以下是已保存的帳戶與授課身份連結。角色只供查看；讀取授權可決定老師可查看哪些課堂，不會增加修改或刪除權限。', 'These are saved accounts and teaching identity links. Roles are shown for reference. Read access decides which lessons a teacher can view without adding edit or delete permissions.'))}</p>
      ${error ? `<p class="mock-staff-error" role="alert">${esc(error)}${users.length ? ` <span>${esc(t('以下是上次成功載入的資料；最新連結暫未能確認。', 'The accounts below were last loaded successfully; the latest links could not be confirmed.'))}</span>` : ''}</p>` : ''}
      ${loading ? `<p class="mock-staff-loading" role="status" aria-live="polite">${esc(users.length ? t('正在更新員工資料…', 'Updating staff…') : t('正在載入員工資料…', 'Loading staff…'))}</p>` : ''}
      ${users.length ? `<ul class="mock-staff-list">${users.map(user => {
        const name = availableText(user.displayName, t('姓名暫未提供', 'Name unavailable'));
        return `<li class="mock-staff-row"><div class="mock-staff-account"><h2>${esc(name)}</h2><p class="mock-staff-login">${esc(availableText(user.username, t('登入名稱暫未提供', 'Username unavailable')))}</p><p class="mock-staff-email">${esc(availableText(user.email, t('電郵暫未提供', 'Email unavailable')))}</p></div><div class="mock-staff-role"><span>${esc(t('角色', 'Role'))}</span><strong>${esc(user.role === 'admin' ? t('管理員', 'Administrator') : t('老師', 'Teacher'))}</strong></div><div class="mock-staff-teaching"><span class="mock-staff-field-label">${esc(t('授課身份連結', 'Teaching identity link'))}</span>${linkedResourcesMarkup(user, links, resources, { t, esc })}</div><div class="mock-staff-row-actions"><button type="button" data-action="staff-access-open" data-user-id="${esc(user.id ?? '')}" aria-label="${esc(t('管理連結及讀取授權', 'Manage links and read access') + ' · ' + name)}"${loading ? ' disabled' : ''}>${esc(t('連結及讀取授權', 'Links and read access'))}</button></div></li>`;
      }).join('')}</ul>` : !loading && !error ? `<p class="mock-staff-empty" role="status">${esc(t('暫無員工帳戶資料。', 'No staff accounts are available.'))}</p>` : ''}
    </div>
  </section>`;
}
