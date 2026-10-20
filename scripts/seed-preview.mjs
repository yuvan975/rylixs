import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
process.env.RYLIXS_DB_PATH=path.join(process.cwd(),'data','preview.sqlite');
const s=await import('../lib/store.mjs');const c=await import('../lib/commerce.mjs');
if(!s.db.prepare('SELECT id FROM users WHERE email=?').get('admin@rylixs.test')){const u=s.register({name:'Preview Store Manager',email:'admin@rylixs.test',password:'Local-test-only-123!'});s.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(u.id)}
s.saveSettings({whatsappNumber:'919025480710',deliveryCharge:49,freeDeliveryAbove:2000,heroTitle:'Wear your style. Own your moment.'});
if(!s.products(true).length){
 for(const [slug,name,image] of [['essentials','Essentials','/hero.jpeg'],['shirts','Shirts','/hero1.jpeg'],['streetwear','Streetwear','/hero2.jpeg']])s.saveCategory({slug,name,image,order:0,active:true});
 const names=['The Ivory Essential','The Everyday Edit','The Weekend Silhouette','The Signature Layer','The Relaxed Essential','The Classic Edit','The Modern Uniform','The Daily Favourite'];
 for(let i=0;i<8;i++)s.saveProduct({name:names[i],slug:'preview-piece-'+(i+1),sku:'PREVIEW-'+(i+1),brand:'RYLIXS · PREVIEW',category:['essentials','shirts','streetwear'][i%3],price:899+i*150,compareAt:1299+i*150,description:'Sample item for testing the RYLIXS shopping experience. Photography is illustrative. This is not a live product for sale.',material:'Sample cotton specification',fit:'Relaxed',care:'Sample: gentle cold wash.',sizeGuide:'Preview sizes: S 36, M 38, L 40, XL 42 inches.',images:[['/hero.jpeg','/hero1.jpeg','/hero2.jpeg'][i%3]],variants:['S','M','L','XL'].flatMap(size=>['Ivory','Black'].map(color=>({size,color,stock:20}))),active:true,featured:i%2===0,newArrival:i<4});
}
if(!c.resources('coupons',true).length)c.saveResource('coupons',{title:'A little welcome gift',description:'Local preview coupon. Minimum purchase INR 500.',code:'WELCOME10',type:'Percentage',value:10,minimum:500,limit:1000,active:true});
if(!c.resources('notifications',true).length)c.saveResource('notifications',{title:'Welcome to the RYLIXS preview',description:'Explore sample products, test checkout, and manage your store. No payment is collected.',type:'General',active:true});
console.log('Preview database ready. Live store data was not modified.');
s.db.close();
