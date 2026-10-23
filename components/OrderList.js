"use client";
import {useEffect,useState} from "react";
import OrderPanel from "./OrderPanel";
import Link from "next/link";
import {Search,ShoppingBag,Truck,Package,CheckCircle2,XCircle,ChevronRight,MoreVertical,Home,LayoutGrid,Tag,User,X} from "lucide-react";
import {api,Photo,useStore} from "./StoreShell";
import {useCart} from "@/context/CartContext";
import "./OrderList.css";
const tabs=["All Orders","Processing","Shipped","Delivered","Cancelled"];
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const date=s=>new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const group=s=>s==="Delivered"?"Delivered":s==="Cancelled"?"Cancelled":["Shipped","Out for Delivery"].includes(s)?"Shipped":"Processing";
export default function OrderList(){
 const {products,preview}=useStore(),{count,addItem,setDrawerOpen}=useCart();
 const [orders,setOrders]=useState(null),[error,setError]=useState(""),[filter,setFilter]=useState("All Orders"),[search,setSearch]=useState(false),[q,setQ]=useState(""),[demo,setDemo]=useState(false),[detail,setDetail]=useState(null),[notice,setNotice]=useState("");
 useEffect(()=>{api("orders").then(d=>setOrders(d.orders)).catch(e=>setError(e.message));},[]);
 const isDemo=false, rows=orders||[],shown=rows.filter(o=>(filter==="All Orders"||group(o.status)===filter)&&[o.id,...o.items.map(i=>i.productNameSnapshot)].join(" ").toLowerCase().includes(q.toLowerCase()));
 function buy(o){let added=0;for(const i of o.items){const p=products.find(p=>p.id===i.productId),v=p?.variants.find(v=>v.size===i.size&&v.color===i.color);if(v?.stock>=i.quantity){addItem(p,{size:i.size,color:i.color,qty:i.quantity});added++;}}setDrawerOpen(false);setNotice(`${added} of ${o.items.length} selections added to your bag. Unavailable selections were skipped.`);}
 function action(o,label,cls=""){return o.sample?<button className={cls} onClick={()=>setDetail({...o,tracking:label==="Track Order"})}>{label}</button>:<Link className={cls} href={`/orders/${o.id}${label==="Track Order"?"#tracking":""}`}>{label}</Link>}
 return <div className="orders-view">
 <header className="ov-header"><div><h1>My Orders</h1><p>Track, manage and view your orders</p></div><div className="ov-tools"><button aria-label="Search orders" aria-expanded={search} onClick={()=>setSearch(!search)}><Search/></button><Link href="/cart" aria-label={`Shopping bag, ${count} items`}><ShoppingBag/>{count>0&&<sup>{count}</sup>}</Link></div></header>
 {search&&<div className="ov-search"><Search size={18}/><input autoFocus aria-label="Order number or product" placeholder="Search order number or product" value={q} onChange={e=>setQ(e.target.value)}/></div>}
 <nav className="ov-tabs" aria-label="Filter orders">{tabs.map(t=><button key={t} aria-pressed={filter===t} onClick={()=>setFilter(t)}>{t}<span>{rows.filter(o=>t==="All Orders"||group(o.status)===t).length}</span></button>)}</nav>
 {notice&&<p className="ov-notice" role="status">{notice} <Link href="/cart">View bag →</Link></p>}
 <main className="ov-list">
 {!isDemo&&error?<div className="ov-empty"><h2>Sign in to view your orders</h2><p>{error}</p><Link href="/login?next=%2Forders">Sign in →</Link></div>:!isDemo&&!orders?<p role="status">Loading your orders…</p>:!shown.length?<div className="ov-empty"><Package/><h2>No orders found</h2><p>{q||filter!=="All Orders"?"Try another search or filter.":"Your orders will appear here after checkout."}</p><Link href="/shop">Explore the shop →</Link></div>:shown.map(o=>{const g=group(o.status),Icon=g==="Cancelled"?XCircle:g==="Processing"?Package:Truck; const message=o.status==="Delivered"?"Your order has been delivered":o.status==="Cancelled"?"Order has been cancelled":o.status==="Pending WhatsApp Confirmation"?"Awaiting store confirmation":o.status==="Out for Delivery"?"Your order is out for delivery":g==="Shipped"?"Your order is on the way":"Order is being prepared";return <article className={`ov-card ov-${g.toLowerCase()}`} key={o.id}>
 <div className="ov-card-head"><div><h2>Order #{o.id.replace("RYX-SAMPLE-","RYX")}</h2><p>Placed on {date(o.createdAt)} <span>•</span> {o.items.reduce((n,i)=>n+i.quantity,0)} items</p></div><div className="ov-status"><Icon/><span>{o.status==="Pending WhatsApp Confirmation"?"Pending":o.status}</span><ChevronRight/></div></div>
 <div className="ov-card-body"><div className="ov-photos">{o.items.slice(0,3).map((i,n)=><Photo key={n} src={i.imageSnapshot} alt={i.productNameSnapshot}/>)}{o.items.length>3&&<span>+{o.items.length-3}</span>}</div><div className="ov-delivery"><strong>{o.items.map(i=>`${i.productNameSnapshot} × ${i.quantity}`).join(", ")}</strong><span>Estimated Delivery</span><strong>{o.status==="Cancelled"?"—":o.estimatedDelivery||"Awaiting confirmation"}</strong><div className="ov-message">{g==="Delivered"?<CheckCircle2/>:<Icon/>}<div><b>{message}</b>{g==="Delivered"&&<small>Thank you for shopping with us!</small>}{g==="Cancelled"&&<small>{o.refundStatus&&o.refundStatus!=="Not requested"?`Refund: ${o.refundStatus}`:"Contact support for any payment queries."}</small>}</div></div></div></div>
 <footer className="ov-card-footer"><div className="ov-total"><span>Total Amount</span><strong>{money(o.total)} <ChevronRight size={14}/></strong></div><div className="ov-actions">{g!=="Cancelled"&&action(o,"Track Order")}{action(o,"View Details")}{g==="Delivered"?<button className="ov-buy" onClick={()=>buy(o)}>Buy Again</button>:<button className="ov-more" aria-label={`More options for ${o.id}`} onClick={()=>setDetail(o)}><MoreVertical/></button>}</div></footer>
 </article>})}
 </main>
 {detail&&<div className="ov-modal-backdrop"><section className="ov-modal" role="dialog" aria-modal="true" aria-label={detail.tracking?"Track order":"Order details"}><button className="ov-close" aria-label="Close order details" onClick={()=>setDetail(null)}><X/></button><OrderPanel order={detail} tracking={detail.tracking}/></section></div>}
 </div>
}

