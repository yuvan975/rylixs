"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "rylixs_cart_v1";

function cartReducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return Array.isArray(action.payload)
        ? action.payload.filter(
            (i) =>
              i &&
              typeof i.id === "string" &&
              Number.isInteger(i.qty) &&
              i.qty > 0 &&
              i.qty <= 99,
          )
        : state;
    case "ADD": {
      const { item } = action;
      const idx = state.findIndex(
        (l) =>
          l.id === item.id && l.size === item.size && l.color === item.color,
      );
      if (idx > -1) {
        const next = [...state];
        next[idx] = {
          ...next[idx],
          qty: Math.min(99, next[idx].qty + item.qty),
        };
        return next;
      }
      return [...state, item];
    }
    case "REMOVE":
      return state.filter((l) => l.lineId !== action.lineId);
    case "UPDATE_QTY":
      return state.map((l) =>
        l.lineId === action.lineId ? { ...l, qty: Math.max(1, action.qty) } : l,
      );
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", payload: JSON.parse(raw) });
    } catch (e) {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      /* storage unavailable */
    }
  }, [items, hydrated]);

  const addItem = (product, { size, color, qty = 1 }) => {
    dispatch({
      type: "ADD",
      item: {
        lineId: `${product.id}-${size}-${color}`,
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        size,
        color,
        qty,
      },
    });
    setDrawerOpen(true);
  };

  const removeItem = (lineId) => dispatch({ type: "REMOVE", lineId });
  const updateQty = (lineId, qty) =>
    dispatch({ type: "UPDATE_QTY", lineId, qty });
  const clearCart = () => dispatch({ type: "CLEAR" });

  const subtotal = useMemo(
    () => items.reduce((sum, l) => sum + l.price * l.qty, 0),
    [items],
  );
  const count = useMemo(
    () => items.reduce((sum, l) => sum + l.qty, 0),
    [items],
  );

  const value = {
    items,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    subtotal,
    count,
    isDrawerOpen,
    setDrawerOpen,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
