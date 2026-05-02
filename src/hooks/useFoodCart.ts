import { useEffect, useState } from 'react';

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  image_url: string;
  quantity: number;
}

export interface CartState {
  merchant_id: string | null;
  merchant_name: string | null;
  items: CartItem[];
}

const KEY = 'food_cart_v1';

const read = (): CartState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { merchant_id: null, merchant_name: null, items: [] };
};

const write = (s: CartState) => localStorage.setItem(KEY, JSON.stringify(s));

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const useFoodCart = () => {
  const [state, setState] = useState<CartState>(read);

  useEffect(() => {
    const handler = () => setState(read());
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const persist = (s: CartState) => {
    write(s);
    emit();
  };

  const setMerchant = (id: string, name: string) => {
    persist({ merchant_id: id, merchant_name: name, items: [] });
  };

  const clear = () => persist({ merchant_id: null, merchant_name: null, items: [] });

  const addItem = (item: Omit<CartItem, 'quantity'>, merchantId: string, merchantName: string) => {
    const s = read();
    if (s.merchant_id && s.merchant_id !== merchantId) return;
    const next: CartState = s.merchant_id
      ? { ...s }
      : { merchant_id: merchantId, merchant_name: merchantName, items: [] };
    const existing = next.items.find((i) => i.product_id === item.product_id);
    if (existing) existing.quantity += 1;
    else next.items.push({ ...item, quantity: 1 });
    persist(next);
  };

  const removeItem = (productId: string) => {
    const s = read();
    const next = { ...s, items: [] as CartItem[] };
    for (const i of s.items) {
      if (i.product_id === productId) {
        if (i.quantity > 1) next.items.push({ ...i, quantity: i.quantity - 1 });
      } else next.items.push(i);
    }
    if (next.items.length === 0) {
      next.merchant_id = null;
      next.merchant_name = null;
    }
    persist(next);
  };

  const total = state.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const count = state.items.reduce((s, i) => s + i.quantity, 0);

  return { state, setMerchant, clear, addItem, removeItem, total, count };
};
