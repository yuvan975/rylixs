process.env.RYLIXS_DB_PATH='data/preview.sqlite';
const s=await import('../lib/store.mjs'),c=await import('../lib/commerce.mjs');
const pictures=['/home/premium-basics.webp','/home/season-hero.webp','/home/summer-collection.webp'];
for(const [i,cat] of s.categories().entries()){
 if(!c.resources('banners',true).some(b=>b.placement==='CategoryPage'&&b.categoryId===cat.id))c.saveResource('banners',{title:`${cat.name}\nby RYLIXS`,description:'Discover your everyday favourites.',eyebrow:'THE CATEGORY EDIT',image:pictures[i%pictures.length],placement:'CategoryPage',categoryId:cat.id,buttonText:'Explore styles',destination:`/shop?category=${cat.id}#shop-products`,textPosition:i%3===2?'Right':'Left',tone:i%3===2?'Light':'Dark',active:true,order:i});
 if(!c.resources('coupons',true).some(x=>x.categoryId===cat.id))c.saveResource('coupons',{title:`${cat.name} welcome offer`,code:`${cat.id.toUpperCase()}10`,type:'Percentage',value:10,minimum:500,categoryId:cat.id,active:true,limit:100});
}
s.db.close();console.log('Separate preview category banners and coupons are ready.');
