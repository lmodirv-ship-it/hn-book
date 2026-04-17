import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  bookId: string;
  name: string;
  image: string;
  price: number;
  category: string;
  referenceCode: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (bookId: string) => void;
  clearCart: () => void;
  isInCart: (bookId: string) => boolean;
  totalPrice: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "hn-book-cart";

function loadLocalCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type DbRow = {
  book_id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  reference_code: string | null;
};

const rowToItem = (r: DbRow): CartItem => ({
  bookId: r.book_id,
  name: r.name,
  image: r.image,
  price: Number(r.price) || 0,
  category: r.category,
  referenceCode: r.reference_code,
});

const itemToRow = (i: CartItem, userId: string) => ({
  user_id: userId,
  book_id: i.bookId,
  name: i.name,
  image: i.image,
  price: i.price,
  category: i.category,
  reference_code: i.referenceCode,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadLocalCart);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Track auth state. On login: merge local + db, persist to db.
  useEffect(() => {
    let mounted = true;

    const syncForUser = async (uid: string) => {
      // 1. Read current DB cart
      const { data: dbRows } = await supabase
        .from("cart_items")
        .select("book_id,name,image,price,category,reference_code")
        .eq("user_id", uid);

      const dbItems: CartItem[] = (dbRows || []).map(rowToItem);
      const localItems = loadLocalCart();

      // 2. Merge (db wins on duplicates, then add local-only)
      const seen = new Set(dbItems.map((i) => i.bookId));
      const toUpload = localItems.filter((i) => !seen.has(i.bookId));

      if (toUpload.length > 0) {
        await supabase
          .from("cart_items")
          .insert(toUpload.map((i) => itemToRow(i, uid)));
      }

      const merged = [...dbItems, ...toUpload];
      if (mounted) {
        setItems(merged);
        // Local cache cleared once synced — DB is source of truth when logged in
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;
      setUserId(uid);
      if (uid) syncForUser(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      const prev = userIdRef.current;
      userIdRef.current = uid;
      setUserId(uid);
      if (uid && uid !== prev) {
        // defer to avoid blocking auth callback
        setTimeout(() => syncForUser(uid), 0);
      } else if (!uid && prev) {
        // signed out → fall back to local cart
        setItems(loadLocalCart());
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Persist guest cart to localStorage
  useEffect(() => {
    if (!userId) saveLocalCart(items);
  }, [items, userId]);

  const addItem = useCallback(
    (item: CartItem) => {
      setItems((prev) => {
        if (prev.some((i) => i.bookId === item.bookId)) {
          toast.info("الكتاب موجود في السلة بالفعل");
          return prev;
        }
        toast.success("تمت الإضافة إلى السلة");
        return [...prev, item];
      });
      const uid = userIdRef.current;
      if (uid) {
        supabase
          .from("cart_items")
          .insert(itemToRow(item, uid))
          .then(({ error }) => {
            if (error && error.code !== "23505") {
              console.error("cart insert failed", error);
            }
          });
      }
    },
    []
  );

  const removeItem = useCallback((bookId: string) => {
    setItems((prev) => prev.filter((i) => i.bookId !== bookId));
    toast.success("تمت الإزالة من السلة");
    const uid = userIdRef.current;
    if (uid) {
      supabase
        .from("cart_items")
        .delete()
        .eq("user_id", uid)
        .eq("book_id", bookId)
        .then(({ error }) => {
          if (error) console.error("cart delete failed", error);
        });
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    const uid = userIdRef.current;
    if (uid) {
      supabase
        .from("cart_items")
        .delete()
        .eq("user_id", uid)
        .then(({ error }) => {
          if (error) console.error("cart clear failed", error);
        });
    }
  }, []);

  const isInCart = useCallback(
    (bookId: string) => items.some((i) => i.bookId === bookId),
    [items]
  );

  const totalPrice = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, clearCart, isInCart, totalPrice, itemCount: items.length }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
