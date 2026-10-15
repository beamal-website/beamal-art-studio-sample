import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMockStaff } from '../client/mock-staff-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ui = language => ({ t: (zh, en) => language === 'en' ? en : zh, esc });
const accessControl = {
  users: [{ id: 'maya', displayName: 'Maya Lam', username: 'maya.lam', email: 'maya@example.test', role: 'admin' }, { id: 'leo', displayName: 'Leo Chan', username: 'leo.chan', role: 'teacher' }, { id: 'chloe', displayName: 'Chloe Ho', role: 'student' }],
  links: [{ userId: 'maya', teacherId: 'maya-teacher' }],
  resources: [{ id: 'maya-teacher', displayName: 'Maya teaching identity', kind: 'teacher', teacherColor: '#426ea8', active: true }]
};

test('staff uses saved named accounts and teacher links with real scope-management entry points', () => {
  const before = JSON.stringify(accessControl), html = renderMockStaff({ accessControl }, ui('en'));
  assert.match(html, /Maya Lam/);
  assert.match(html, /Leo Chan/);
  assert.match(html, /maya\.lam/);
  assert.match(html, /Maya teaching identity/);
  assert.match(html, /Administrator/);
  assert.match(html, /data-action="staff-access-open" data-user-id="maya"/);
  assert.match(html, /data-action="staff-access-open" data-user-id="leo"/);
  assert.match(html, /data-action="staff-resources-open"/);
  assert.match(html, /Unlinked/);
  assert.doesNotMatch(html, /Teacher 1|Teacher 2|Chloe Ho|<input|<select|checkbox|management-preview|>Save</);
  assert.equal(JSON.stringify(accessControl), before);
});

test('staff accepts current API field names without losing an administrator teaching link', () => {
  const apiSnapshot = { accounts: accessControl.users, teacherLinks: [{ userId: 'maya', teacherResourceId: 'maya-teacher' }], resources: accessControl.resources };
  const html = renderMockStaff({ accessControl: apiSnapshot }, ui('zh'));
  assert.match(html, /Maya teaching identity/);
  assert.match(html, /管理員/);
  assert.match(html, /讀取授權/);
  assert.doesNotMatch(html, /Teacher 1|Teacher 2/);
});

test('staff shows loading and service failures explicitly and does not offer false empty-success', () => {
  const loading = renderMockStaff({ loading: true }, ui('en'));
  assert.match(loading, /Loading/);
  assert.match(loading, /aria-busy="true"/);
  assert.doesNotMatch(loading, /No staff accounts/);
  const failed = renderMockStaff({ error: 'Read denied' }, ui('en'));
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Read denied/);
  assert.doesNotMatch(failed, /No staff accounts/);
  const empty = renderMockStaff({ accessControl: {} }, ui('en'));
  assert.match(empty, /No staff accounts/);
});

test('staff safely labels missing resource data and escapes long names and action identities', () => {
  const html = renderMockStaff({ accessControl: { users: [{ id: 'u" onclick="bad()', displayName: '<script>bad()</script>' + ' Long'.repeat(40), username: '<user>', role: 'teacher' }], links: [{ userId: 'u" onclick="bad()', teacherId: 'missing' }], resources: [] } }, ui('en'));
  assert.match(html, /Teaching resource unavailable/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.match(html, /&lt;user&gt;/);
  assert.match(html, /data-user-id="u&quot; onclick=&quot;bad\(\)"/);
  assert.doesNotMatch(html, /<script>|onclick="bad|undefined|Teacher 1|Teacher 2/);
  assert.match(html, /type="button"/);
});
