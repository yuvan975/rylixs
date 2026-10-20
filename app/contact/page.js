"use client";
import { useStore } from "@/components/StoreShell";
export default function Contact() {
  const { settings: s } = useStore();
  return (
    <section className="store-section narrow">
      <p className="eyebrow">LET’S TALK</p>
      <h1>A personal conversation.</h1>
      <p>For product questions, sizing and order enquiries, contact RYLIXS.</p>
      {s.whatsappNumber ? (
        <a
          className="button"
          target="_blank"
          rel="noreferrer"
          href={"https://wa.me/" + s.whatsappNumber}
        >
          Chat on WhatsApp ↗
        </a>
      ) : (
        <p>Contact details will be available soon.</p>
      )}
      {s.contactEmail && (
        <p>
          <a href={"mailto:" + s.contactEmail}>{s.contactEmail}</a>
        </p>
      )}
      {s.businessAddress && <p>{s.businessAddress}</p>}
      {s.instagram && (
        <p>
          <a href={s.instagram} target="_blank" rel="noreferrer">
            Find us on Instagram ↗
          </a>
        </p>
      )}
    </section>
  );
}
