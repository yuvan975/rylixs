"use client";
import { useEffect, useState } from "react";

/** The supplied brand artwork is kept intact so the reference remains exact. */
export default function BrandSplash({ preview = false }) {
  const [show, setShow] = useState(preview);
  useEffect(() => {
    if (preview) return;
    try {
      if (sessionStorage.getItem("rylixs_splash_reference_v1")) return;
      sessionStorage.setItem("rylixs_splash_reference_v1", "1");
    } catch { /* The splash also works when browser storage is unavailable. */ }
    setShow(true);
    const timer = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(timer);
  }, [preview]);

  if (!show) return null;
  return (
    <div className="reference-splash" role="status" aria-label="RYLIXS. Wear your style. Loading style.">
      <div className="reference-splash-artwork">
        <img
          src="/rylixs-splash-reference.png"
          width="738"
          height="1600"
          alt="RYLIXS gold monogram, crown and Wear Your Style tagline, surrounded by a cream fashion studio with plants and a clothing rail. Loading style."
          loading="eager"
          fetchPriority="high"
          draggable="false"
        />
        <span className="reference-splash-spinner" aria-hidden="true" />
      </div>
    </div>
  );
}
