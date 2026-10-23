"use client";
import {Photo,useStore} from "./StoreShell";
export default function PageBanner({placement}) {
 const {banners=[]}=useStore(); const rows=banners.filter(b=>b.placement===placement);
 if(!rows.length)return null;
 return <div className="page-banners">{rows.map(b=><picture key={b.id}>{b.mobileImage&&<source media="(max-width:600px)" srcSet={b.mobileImage}/>}<Photo src={b.image} alt={b.title||`${placement} collection`}/></picture>)}</div>;
}
