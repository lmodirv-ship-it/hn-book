/**
 * Script Allow List System
 * Only predefined safe actions can be executed. Everything else is blocked.
 */

export interface AllowedAction {
  name: string;
  description: string;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
  params?: { name: string; type: string; required?: boolean }[];
}

export interface ActionResult {
  success: boolean;
  action: string;
  result?: unknown;
  error?: string;
  blocked?: boolean;
  duration: number;
}

// ─── Registry ───

const registry = new Map<string, AllowedAction>();

export function registerAction(action: AllowedAction) {
  registry.set(action.name, action);
}

export function removeAction(name: string) {
  registry.delete(name);
}

export function listActions(): AllowedAction[] {
  return [...registry.values()];
}

export function isAllowed(name: string): boolean {
  return registry.has(name);
}

// ─── Execute ───

export async function executeAction(name: string, ...args: unknown[]): Promise<ActionResult> {
  const start = performance.now();

  if (!registry.has(name)) {
    return {
      success: false,
      action: name,
      blocked: true,
      error: `الإجراء "${name}" غير مسموح`,
      duration: performance.now() - start,
    };
  }

  const action = registry.get(name)!;
  try {
    const result = await action.handler(...args);
    return { success: true, action: name, result, blocked: false, duration: performance.now() - start };
  } catch (err: unknown) {
    return {
      success: false,
      action: name,
      blocked: false,
      error: err instanceof Error ? err.message : String(err),
      duration: performance.now() - start,
    };
  }
}

// ─── Default safe actions ───

import { supabase } from "@/integrations/supabase/client";

registerAction({
  name: "updatePrice",
  description: "تحديث سعر منتج",
  params: [
    { name: "productId", type: "string", required: true },
    { name: "newPrice", type: "number", required: true },
  ],
  handler: async (productId: unknown, newPrice: unknown) => {
    if (typeof productId !== "string" || typeof newPrice !== "number" || newPrice < 0)
      throw new Error("معطيات غير صالحة");
    const { error } = await supabase.from("products").update({ price: newPrice }).eq("id", productId);
    if (error) throw error;
    return { updated: true, productId, newPrice };
  },
});

registerAction({
  name: "fixSystem",
  description: "تشغيل إصلاح النظام التلقائي",
  handler: async () => {
    const { data, error } = await supabase.functions.invoke("system-repair", {
      body: { action: "repair" },
    });
    if (error) throw error;
    return data;
  },
});

registerAction({
  name: "rebuildProducts",
  description: "إعادة بناء بيانات المنتجات (أغلفة + أكواد)",
  handler: async () => {
    const { data, error } = await supabase.functions.invoke("system-repair", {
      body: { action: "rebuild_products" },
    });
    if (error) throw error;
    return data;
  },
});

export const allowList = { registerAction, removeAction, listActions, isAllowed, executeAction };
