process.env.RYLIXS_DB_PATH='data/preview.sqlite';
const s=await import('../lib/store.mjs'),c=await import('../lib/commerce.mjs');
if(!c.resources('banners',true).some(b=>b.placement==='Shop'))c.saveResource('banners',{title:'Everyday style.\nThe RYLIXS way.',description:'Fresh favourites, made for your everyday moments.',eyebrow:'THE NEW EDIT',image:'/home/season-hero.webp',placement:'Shop',buttonText:'Explore collection',destination:'/shop#shop-products',tone:'Dark',textPosition:'Left',active:true,order:3});
s.db.close();console.log('Editable shop banner ready.');
