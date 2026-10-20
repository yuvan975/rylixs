"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {api,Skeleton} from "./StoreShell";
import OrderPanel from "./OrderPanel";
export default function Orders({id}){const [data,setData]=useState(null),[error,setError]=useState(""),[tracking,setTracking]=useState(false);useEffect(()=>{const change=()=>setTracking(window.location.hash==="#tracking");change();window.addEventListener("hashchange",change);api("orders/"+id).then(setData).catch(e=>setError(e.message));return()=>window.removeEventListener("hashchange",change);},[id]);return <main className="order-detail-page"><Link className="op-back" href="/orders"><ArrowLeft size={17}/>My Orders</Link>{error?<section className="op-card"><p role="alert">{error}</p><Link href={`/login?next=${encodeURIComponent('/orders/'+id)}`}>Sign in</Link></section>:!data?<Skeleton/>:<OrderPanel order={data.order} tracking={tracking} whatsappUrl={data.whatsappUrl}/>}</main>}
