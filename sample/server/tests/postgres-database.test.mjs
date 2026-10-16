import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {replacePlaceholders,translateSql,waitForPostgresWorker} from '../postgres-database.mjs';

test('PostgreSQL adapter translates SQLite startup and mutation statements',()=>{
 assert.equal(translateSql('PRAGMA foreign_keys = ON'),'');
 assert.match(translateSql('PRAGMA table_info(courses)'),/information_schema\.columns/);
 assert.equal(translateSql('BEGIN IMMEDIATE'),'BEGIN');
 assert.equal(translateSql('CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT)'), 'CREATE TABLE audit (id BIGSERIAL PRIMARY KEY, actor TEXT)');
 assert.equal(translateSql('INSERT OR IGNORE INTO class_types(id,name) VALUES (?,?)'),'INSERT INTO class_types(id,name) VALUES (?,?) ON CONFLICT DO NOTHING');
 assert.equal(translateSql('UPDATE course_sequence SET value=MAX(value, ?) WHERE id=1'),'UPDATE course_sequence SET value=GREATEST(value, ?) WHERE id=1');
 assert.equal(translateSql('SELECT * FROM people WHERE instr(search_text, ?) > 0'),'SELECT * FROM people WHERE strpos(search_text, ?) > 0');
});

test('PostgreSQL parameter conversion leaves question marks inside SQL strings and comments intact',()=>{
 const source=`SELECT ?, '?', "?" -- ?
, ?`;
 const expected=`SELECT $1, '?', "?" -- ?
, $2`;
 assert.equal(replacePlaceholders(source),expected);
});

test('PostgreSQL worker readiness accepts a successful startup message',async()=>{
 const worker=new EventEmitter();
 const ready=waitForPostgresWorker(worker);
 worker.emit('message',{ready:true});
 await ready;
});

test('PostgreSQL worker readiness forwards connection errors',async()=>{
 const worker=new EventEmitter();
 const ready=waitForPostgresWorker(worker);
 worker.emit('message',{ready:false,error:{message:'password authentication failed',code:'28P01'}});
 await assert.rejects(ready,{message:'password authentication failed',code:'28P01'});
});