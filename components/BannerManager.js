"use client";
import { useState } from "react";
import { Photo } from "./StoreShell";

const names = { Hero: "Home main banner", Offer: "Home offer banner", Category: "Home collection banner", Shop: "Shop banner", CategoryPage: "Category banner" };
export default function BannerManager({ data, mutate, upload, busy, placement }) {
  const [draft, setDraft] = useState(null);
  const fixed = placement && placement !== "Home";
  const rows = (data.banners || []).filter(b => !placement || (placement === "Home" ? ["Hero", "Offer", "Category"].includes(b.placement) : b.placement === placement));
  return <>
    <p className="quiet">Upload your finished banner artwork, including any words or offers. Your whole image is displayed without added text or cropping.</p>
    {!draft && <button className="button" onClick={() => setDraft({ placement: fixed ? placement : "Hero", categoryId: "", image: "", mobileImage: "", active: true, order: rows.length })}>+ Upload banner</button>}
    {draft ? <form className="panel editor" onSubmit={async e => {
      e.preventDefault();
      const category = data.categories.find(c => c.id === draft.categoryId);
      if (await mutate("admin/resources/banners", "POST", { ...draft, title: category ? `${category.name} banner` : names[draft.placement], description: "", eyebrow: "", badge: "", destination: draft.placement === "CategoryPage" ? `/shop?category=${draft.categoryId}` : "/shop" })) setDraft(null);
    }}>
      <div className="section-heading"><h2>{draft.id ? "Replace banner photo" : "Upload banner photo"}</h2><button type="button" onClick={() => setDraft(null)}>Close</button></div>
      {!fixed && <label>Banner location<select value={draft.placement} onChange={e => setDraft({ ...draft, placement: e.target.value })}>{(placement === "Home" ? ["Hero", "Offer", "Category"] : Object.keys(names)).map(p => <option key={p} value={p}>{names[p]}</option>)}</select></label>}
      {draft.placement === "CategoryPage" && <label>Category<select required value={draft.categoryId} onChange={e => setDraft({ ...draft, categoryId: e.target.value })}><option value="">Choose category</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      {["image", "mobileImage"].map(key => <div key={key}>
        <label>{key === "image" ? "Banner photo" : "Mobile photo (optional)"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) upload(file, url => setDraft(current => current ? { ...current, [key]: url } : current)); }}/></label>
        {draft[key] && <><Photo className="banner-preview" src={draft[key]} alt="Uploaded banner preview"/>{key === "mobileImage" && <button type="button" onClick={() => setDraft({ ...draft, mobileImage: "" })}>Remove mobile photo</button>}</>}
      </div>)}
      <p className="quiet">JPEG, PNG or WebP, up to 5 MB. Use a sharp, high-resolution image. The main photo also fits phones when no mobile photo is uploaded.</p>
      <button className="button" disabled={busy || !draft.image}>{busy ? "Uploading…" : "Save banner"}</button>
    </form> : <div className="resource-grid">{rows.map(b => <article className="panel" key={b.id}>
      <Photo className="banner-preview" src={b.image} alt={names[b.placement] || "RYLIXS banner"}/>
      <h3>{names[b.placement]}{b.categoryId ? ` · ${data.categories.find(c => c.id === b.categoryId)?.name || b.categoryId}` : ""}</h3>
      <div className="actions"><button disabled={busy} onClick={() => setDraft({ ...b, active: true })}>Replace photo</button><button disabled={busy} onClick={() => mutate(`admin/resources/banners/${b.id}`, "DELETE", {})}>Delete</button><button disabled={busy} onClick={() => mutate("admin/banner-order", "POST", { id: b.id, direction: "up" })}>Move up</button><button disabled={busy} onClick={() => mutate("admin/banner-order", "POST", { id: b.id, direction: "down" })}>Move down</button></div>
    </article>)}</div>}
    {!draft && !rows.length && <p className="panel">No banners yet. Upload a photo to add one.</p>}
  </>;
}
