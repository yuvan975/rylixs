// Export only storefront content, never users, sessions, addresses or orders.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
const db = new DatabaseSync('data/preview.sqlite', {readOnly:true});
const read = table => db.prepare(`SELECT data FROM ${table}`).all().map(r=>JSON.parse(r.data));
const payload={products:read('products'),categories:read('categories'),resources:db.prepare("SELECT kind,data FROM resources WHERE kind IN ('banners','coupons','offers')").all().map(r=>({kind:r.kind,...JSON.parse(r.data)})),settings:read('settings')[0]};
mkdirSync('public/demo-media',{recursive:true});
function images(value){
 if(Array.isArray(value))return value.map(images);
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,images(v)]));
 if(typeof value==='string' && /^\/(api\/media|uploads)\/[0-9a-f-]+\.webp$/.test(value)){
  const name=path.basename(value);copyFileSync(path.join('public/uploads',name),path.join('public/demo-media',name));return '/demo-media/'+name;
 }
 return value;
}
writeFileSync('scripts/demo-catalog.json',JSON.stringify(images(payload),null,2));
db.close();
console.log('Exported storefront content only.');
