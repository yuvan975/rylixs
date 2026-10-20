process.env.RYLIXS_DB_PATH='data/preview.sqlite';
const s=await import('../lib/store.mjs');const c=await import('../lib/commerce.mjs');
for(const b of c.resources('banners',true)) if(['/shop?category=dresses','/shop?category=knitwear'].includes(b.destination)) c.saveResource('banners',{...b,destination:'/shop'});
s.db.close();
