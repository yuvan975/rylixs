"use client";
import { useEffect, useState } from "react";
export default function OfferTimer({ until }) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, Date.parse(until) - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [until]);
  if (remaining === null) return <small>Limited time offer</small>;
  return (
    <small>
      {remaining
        ? `${Math.floor(remaining / 86400000)}d ${Math.floor(remaining / 3600000) % 24}h ${Math.floor(remaining / 60000) % 60}m ${Math.floor(remaining / 1000) % 60}s remaining`
        : "Offer ended"}
    </small>
  );
}
