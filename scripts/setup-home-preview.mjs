import path from 'node:path';
process.env.RYLIXS_DB_PATH=path.join(process.cwd(),'data','preview.sqlite');
const s=await import('../lib/store.mjs');const c=await import('../lib/commerce.mjs');
s.db.exec('CREATE TABLE IF NOT EXISTS app_migrations(id TEXT PRIMARY KEY)');
if(!s.db.prepare('SELECT id FROM app_migrations WHERE id=?').get('reference-home-v1')){
 s.transaction(()=>{
 const items=[
 {title:'Timeless Style\nFor Every You',description:'Trendy outfits, premium quality, made for your everyday moments.',image:'/home/season-hero.webp',eyebrow:'NEW SEASON',buttonText:'Shop Now',placement:'Hero',textPosition:'Left',tone:'Dark',destination:'/shop'},
 {title:'Summer\nCollection',description:'Light fabrics. Fresh vibes.',image:'/home/summer-collection.webp',buttonText:'Shop Now',placement:'Offer',textPosition:'Right',tone:'Light',destination:'/shop'},
 {title:'Premium Basics',description:'Quality you’ll love, styles you’ll wear.',image:'/home/premium-basics.webp',buttonText:'Explore',placement:'Category',textPosition:'Left',tone:'Dark',destination:'/shop'}];
 for(const [i,b] of items.entries())c.saveResource('banners',{...b,active:true,order:i});
 s.db.prepare('INSERT INTO app_migrations VALUES(?)').run('reference-home-v1');
 });
}
console.log('Reference home banners are stored in the preview database and editable in admin.');s.db.close();

