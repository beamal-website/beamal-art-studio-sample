import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccessControlStore } from '../access-control.mjs';

test('authentication access summaries avoid duplicate identity and transaction round trips', () => {
  const statements = [], commands = [];
  let depth = 0, savepoint = 0;
  const database = {
    exec(source) { commands.push(source.trim()); },
    prepare(source) {
      statements.push(source);
      return {
        get(id) {
          return { id, display_name: 'QA Administrator', role: 'admin' };
        },
        all() {
          return [{ teacher_resource_id: 'teacher-profile' }];
        },
      };
    },
  };
  const transaction = (callback, mode = 'write') => {
    const outer = depth === 0, point = `nested_${++savepoint}`;
    commands.push(outer ? mode === 'read' ? 'BEGIN' : 'BEGIN IMMEDIATE' : `SAVEPOINT ${point}`);
    depth++;
    try {
      const result = callback();
      commands.push(outer ? 'COMMIT' : `RELEASE SAVEPOINT ${point}`);
      return result;
    } finally {
      depth--;
    }
  };
  const access = createAccessControlStore({ database, transaction });
  statements.length = 0;
  commands.length = 0;

  assert.match(access.revisionFor({ id: 'admin-id' }), /^[a-f0-9]{64}$/);
  assert.deepEqual(statements, ['SELECT id,display_name,role FROM users WHERE id=?']);
  assert.deepEqual(commands, ['BEGIN', 'COMMIT']);

  statements.length = 0;
  commands.length = 0;
  assert.deepEqual(access.ownTeacherResourceIds({ id: 'admin-id' }), ['teacher-profile']);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /JOIN users/);
  assert.deepEqual(commands, []);
});
