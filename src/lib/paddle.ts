/**
 * Paddle.js loader + helpers.
 * Token derives environment: test_* → sandbox, live_* → production.
 */
import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

let initPromise: Promise<void> | null = null;

export function getPaddleEnv(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

export function isPaddleConfigured(): boolean {
  return Boolean(clientToken);
}

export async function initializePaddle(): Promise<void> {
  if (initPromise) return initPromise;
  if (!clientToken) {
    throw new Error("Payments are not configured (missing client token).");
  }

  initPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.Paddle) {
      try {
        const env = clientToken!.startsWith("test_") ? "sandbox" : "production";
        window.Paddle.Environment.set(env);
        window.Paddle.Initialize({ token: clientToken });
        return resolve();
      } catch (e) {
        return reject(e);
      }
    }
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      try {
        const env = clientToken!.startsWith("test_") ? "sandbox" : "production";
        window.Paddle.Environment.set(env);
        window.Paddle.Initialize({ token: clientToken });
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error("Failed to load Paddle.js"));
    document.head.appendChild(script);
  });

  return initPromise;
}

const priceCache = new Map<string, string>();

export async function getPaddlePriceId(priceId: string): Promise<string> {
  if (priceCache.has(priceId)) return priceCache.get(priceId)!;
  const environment = getPaddleEnv();
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId) {
    throw new Error(`Failed to resolve price "${priceId}": ${error?.message || "not found"}`);
  }
  priceCache.set(priceId, data.paddleId);
  return data.paddleId as string;
}

export interface OpenCheckoutOptions {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  customData?: Record<string, string>;
  successUrl?: string;
}

export async function openCheckout(options: OpenCheckoutOptions): Promise<void> {
  await initializePaddle();
  const paddlePriceId = await getPaddlePriceId(options.priceId);

  window.Paddle.Checkout.open({
    items: [{ priceId: paddlePriceId, quantity: options.quantity ?? 1 }],
    customer: options.customerEmail ? { email: options.customerEmail } : undefined,
    customData: options.customData,
    settings: {
      displayMode: "overlay",
      theme: "dark",
      successUrl:
        options.successUrl ||
        `${window.location.origin}/billing?checkout=success`,
      allowLogout: false,
      variant: "one-page",
    },
  });
}
