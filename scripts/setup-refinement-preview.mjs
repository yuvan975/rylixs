// Only adds presentation samples to the local preview database.
import path from 'node:path';
process.env.RYLIXS_DB_PATH=path.join(process.cwd(),'data','preview.sqlite');
const s=await import('../lib/store.mjs'),c=await import('../lib/commerce.mjs');
if(!c.resources('lookbook',true).length){
 for(const [i,title,image,description] of [[0,'The After Hours Edition','/home/premium-basics.webp','A first look at the next RYLIXS edit. Sample collection imagery for this local preview.'],[1,'A New Perspective','/home/season-hero.webp','Fresh silhouettes for the days ahead. Sample launch — final pieces will be added by the store.']]) c.saveResource('lookbook',{title,image,description,active:true,order:i,launchAt:new Date(Date.now()+(i+7)*86400000).toISOString()});
}
if(!c.resources('banners',true).some(b=>b.placement==='Profile')) c.saveResource('banners',{title:'RYLIXS profile collection',image:'/home/premium-basics.webp',placement:'Profile',destination:'/shop',active:true,order:0});
console.log('Local sample editions and profile banner are ready.');s.db.close();
