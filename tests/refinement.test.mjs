import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'rylixs-refinement-'));
process.env.RYLIXS_DB_PATH=path.join(dir,'qa.sqlite');
const s=await import('../lib/store.mjs'),c=await import('../lib/commerce.mjs');
test('profile metadata persists per account and is optional',()=>{
 const a=s.register({name:'A Customer',email:'a@example.test',password:'Test-password-123!'}),b=s.register({name:'B Customer',email:'b@example.test',password:'Test-password-123!'});
 const edited=s.updateProfile(a,{...a,avatar:'/hero.jpeg',dob:'2000-01-12',gender:'Male'});
 assert.equal(edited.avatar,'/hero.jpeg');assert.equal(edited.dob,'2000-01-12');assert.equal(s.publicUser(s.db.prepare('SELECT * FROM users WHERE id=?').get(b.id)).avatar,undefined);
 assert.throws(()=>s.updateProfile(a,{...edited,dob:'2999-01-01'}));assert.throws(()=>s.updateProfile(a,{...edited,avatar:'javascript:alert(1)'}));
 assert.equal(s.updateProfile(a,{...edited,avatar:'',dob:'',gender:''}).avatar,'');
});
test('lookbook draft, publication, countdown date, replacement and deletion',()=>{
 const draft=c.saveResource('lookbook',{title:'Edition 01',description:'Coming soon',image:'/hero.jpeg',launchAt:'2026-12-01T12:00',active:false});
 assert.equal(c.resources('lookbook').length,0);
 const published=c.saveResource('lookbook',{...draft,active:true});assert.equal(c.resources('lookbook')[0].launchAt,'2026-12-01T12:00:00.000Z');
 assert.equal(c.saveResource('lookbook',{...published,image:'/hero1.jpeg'}).image,'/hero1.jpeg');
 assert.throws(()=>c.saveResource('lookbook',{...published,launchAt:'bad'}));
 c.deleteResource('lookbook',published.id);assert.equal(c.resources('lookbook',true).length,0);
});
test('page banners and editorial text remain admin configurable',()=>{
 for(const placement of ['Profile','Story','Contact','Lookbook','Wishlist','Checkout','Offers']){const b=c.saveResource('banners',{title:placement,image:'/hero.jpeg',placement,active:true});assert.equal(b.placement,placement);}
 s.saveSettings({storyTitle:'Our own story',storyText:'A personal wardrobe.',lookbookTitle:'Coming soon',contactText:'Chat with us.'});assert.equal(s.settings().storyTitle,'Our own story');
});
test.after(()=>{s.db.close();rmSync(dir,{recursive:true,force:true});});
