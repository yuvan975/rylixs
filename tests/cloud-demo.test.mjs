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
const {db}=await import('../lib/store.mjs');
test('public hosting cannot create test customer sessions',()=>{
 process.env.RYLIXS_PUBLIC_DEMO='true';
 assert.throws(()=>previewUser(),/disabled/);
 assert.equal(process.env.RYLIXS_INSECURE_LOCAL_HTTP,undefined);
});
test('preview login remains disabled without an explicit testing flag',()=>{
 delete process.env.RYLIXS_PUBLIC_DEMO;
 assert.throws(()=>previewUser(),/disabled/);
});
test.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
