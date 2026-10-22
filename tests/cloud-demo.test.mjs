import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(tmpdir(),'rylixs-demo-'));
process.env.RYLIXS_DB_PATH=path.join(dir,'test.sqlite');
delete process.env.RYLIXS_LOCAL_PREVIEW;
delete process.env.RYLIXS_INSECURE_LOCAL_HTTP;
const {previewUser}=await import('../lib/google-auth.mjs');
const {db,createSession,sessionUser}=await import('../lib/store.mjs');
test('cloud test sessions are isolated customers without disabling HTTPS security',()=>{
 process.env.RYLIXS_PUBLIC_DEMO='true';
 const first=previewUser(),second=previewUser();
 assert.notEqual(first.id,second.id);
 assert.equal(first.role,'customer');
 assert.equal(second.role,'customer');
 assert.equal(sessionUser(createSession(first.id)).id,first.id);
 assert.equal(process.env.RYLIXS_INSECURE_LOCAL_HTTP,undefined);
});
test('preview login remains disabled without an explicit testing flag',()=>{
 delete process.env.RYLIXS_PUBLIC_DEMO;
 assert.throws(()=>previewUser(),/disabled/);
});
test.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
