import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
if(process.env.RYLIXS_PUBLIC_DEMO !== 'true') throw new Error('This launcher is for the resettable testing service only.');
if(!process.env.RYLIXS_SITE_URL && process.env.RENDER_EXTERNAL_URL) process.env.RYLIXS_SITE_URL=process.env.RENDER_EXTERNAL_URL;
const s=await import('../lib/store.mjs');
const c=await import('../lib/commerce.mjs');
const email=process.env.RYLIXS_ADMIN_EMAIL,password=process.env.RYLIXS_ADMIN_PASSWORD;
if(!email || !password || password.length<16) throw new Error('Configure private demo administrator credentials.');
if(!s.db.prepare('SELECT id FROM users WHERE email=?').get(email))s.db.prepare("INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,'RYLIXS Manager','admin')").run(randomUUID(),email,s.hashPassword(password));
if(!s.products(true).length){
 const seed=JSON.parse(readFileSync(new URL('./demo-catalog.json',import.meta.url),'utf8'));
 s.transaction(()=>{
  for(const row of seed.categories)s.saveCategory(row);
  for(const row of seed.products)s.db.prepare('INSERT INTO products VALUES(?,?,?)').run(row.id,row.slug,JSON.stringify(row));
  for(const {kind,...row} of seed.resources){
   // Deleted categories must not turn an old category coupon into a storewide offer.
   if(row.categoryId && !seed.categories.some(category=>category.id===row.categoryId))continue;
   c.saveResource(kind,{...row,id:undefined});
  }
  s.saveSettings(seed.settings);
 });
}
s.db.close();
if(process.argv.includes("--seed-only")){console.log("Cloud testing seed validated.");process.exit(0);}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port',process.env.PORT||'10000'],{stdio:'inherit',env:process.env});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
