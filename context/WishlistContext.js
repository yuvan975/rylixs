"use client";

import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext(null);
const STORAGE_KEY = "rylixs_wishlist_v1";

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const value = JSON.parse(raw);
        if (Array.isArray(value))
          setIds(value.filter((x) => typeof x === "string"));
      }
    } catch (e) {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      /* ignore */
    }
  }, [ids, hydrated]);

  const toggle = (id) =>
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const isSaved = (id) => ids.includes(id);

  return (
    <WishlistContext.Provider value={{ ids, toggle, isSaved }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
