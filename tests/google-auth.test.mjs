import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'rylixs-oauth-'));
process.env.RYLIXS_DB_PATH=path.join(dir,'auth.sqlite');
process.env.GOOGLE_CLIENT_ID='unit-test';
process.env.GOOGLE_CLIENT_SECRET='unit-test';
const s=await import('../lib/store.mjs');
const auth=await import('../lib/google-auth.mjs');
const customer=s.register({name:'Customer',email:'oauth@example.test',password:'Strong-test-password-123!'});
const verifier=()=>randomBytes(32).toString('base64url');
const challenge=v=>createHash('sha256').update(v).digest('base64url');
test('OAuth uses PKCE and rejects app challenge injection and unsafe return URLs',()=>{
  const flow=auth.startOAuth('//evil.test',challenge(verifier()));
  const url=new URL(flow.url);
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(JSON.parse(s.db.prepare('SELECT data FROM oauth_states WHERE state=?').get(flow.state).data).next,'/account');
  assert.throws(()=>auth.startOAuth('/account','bad'));
});
test('OAuth rejects missing/mismatched cookie before contacting Google',async()=>{
  const flow=auth.startOAuth('/checkout');
  await assert.rejects(auth.finishOAuth(flow.state,'fake','wrong'));
  await assert.rejects(auth.finishOAuth(null,'fake',null));
});
test('callbacks stay on configured origins and ignore attacker hostnames',()=>{
  process.env.RYLIXS_ADDITIONAL_ORIGINS='https://rylixs.com,https://www.rylixs.com';
  const flow=auth.startOAuth('/checkout',null,'https://rylixs.com');
  assert.equal(new URL(flow.url).searchParams.get('redirect_uri'),'https://rylixs.com/api/auth/google/callback');
  const bad=auth.startOAuth('/checkout',null,'https://evil.test');
  assert.equal(new URL(bad.url).searchParams.get('redirect_uri'),auth.oauthConfig().redirectUri);
});
test('Android grant is bound to app secret, expires, and is single use',()=>{
  const secret=verifier();
  auth.issueAppGrant({appChallenge:challenge(secret),user:customer,next:'/checkout'});
  assert.throws(()=>auth.redeemAppGrant(verifier()));
  const result=auth.redeemAppGrant(secret);
  assert.equal(result.user.id,customer.id);assert.equal(result.next,'/checkout');
  assert.throws(()=>auth.redeemAppGrant(secret));
  auth.issueAppGrant({appChallenge:challenge(secret),user:customer,next:'/account'});
  s.db.prepare('UPDATE app_auth_grants SET expires=0').run();
  assert.throws(()=>auth.redeemAppGrant(secret));
  assert.throws(()=>auth.redeemAppGrant('bad'));
});
test('verified Google callback creates a real customer and cannot be replayed',async()=>{
  const originalFetch=globalThis.fetch;
  const secret=verifier(), flow=auth.startOAuth('/checkout',challenge(secret),'https://rylixs.com');
  let requests=0;
  globalThis.fetch=async(url,options)=>{
    requests++;
    if(String(url).endsWith('/token')){
      assert.equal(options.body.get('redirect_uri'),'https://rylixs.com/api/auth/google/callback');
      assert.ok(options.body.get('code_verifier'));
      return new Response(JSON.stringify({access_token:'mock-access-token'}));
    }
    assert.equal(options.headers.Authorization,'Bearer mock-access-token');
    return new Response(JSON.stringify({sub:'verified-google-subject',email:'real@example.test',email_verified:true,name:'Real Customer'}));
  };
  try{
    const result=await auth.finishOAuth(flow.state,'mock-code',flow.state);
    assert.equal(result.user.email,'real@example.test');assert.equal(result.next,'/checkout');
    assert.equal(result.origin,'https://rylixs.com');assert.equal(result.appChallenge,challenge(secret));
    assert.equal(result.user.role,'customer');assert.equal(requests,2);
    await assert.rejects(auth.finishOAuth(flow.state,'mock-code',flow.state));
    assert.equal(requests,2);
  }finally{globalThis.fetch=originalFetch;}
});
test('public demo flag cannot enable test customer login',()=>{
  process.env.RYLIXS_PUBLIC_DEMO='true';
  delete process.env.RYLIXS_LOCAL_PREVIEW;delete process.env.RYLIXS_INSECURE_LOCAL_HTTP;
  assert.throws(()=>auth.previewUser());
});
test.after(()=>{s.db.close();rmSync(dir,{recursive:true,force:true});});
