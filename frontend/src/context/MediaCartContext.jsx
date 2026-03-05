import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "rateople_media_cart";

const MediaCartContext = createContext(null);

export function MediaCartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  /**
   * Add an item to the cart.
   * item shape: { type: "Movie"|"Book"|"TvSeries", data: CreateMovieDto | CreateBookDto | CreateTvSeriesDto }
   */
  function addItem(type, data) {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type, data },
    ]);
  }

  /** Replace the data payload of an existing cart item (after editing) */
  function editItem(id, data) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, data } : item))
    );
  }

  /** Remove a single item */
  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  /** Wipe the entire cart (called after successful bulk submit) */
  function clearCart() {
    setItems([]);
  }

  return (
    <MediaCartContext.Provider
      value={{ items, addItem, editItem, removeItem, clearCart }}
    >
      {children}
    </MediaCartContext.Provider>
  );
}

export function useMediaCart() {
  const ctx = useContext(MediaCartContext);
  if (!ctx) throw new Error("useMediaCart must be used inside MediaCartProvider");
  return ctx;
}
