/**
 * Banner shown only in test mode (when client token starts with test_).
 * Renders nothing in production builds with the live token.
 */
const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("test_")) return null;

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-200" dir="ltr">
      🧪 Test mode — use card{" "}
      <code className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">4242 4242 4242 4242</code>
      , any future expiry, CVC <code className="font-mono">123</code>. No real charges.
    </div>
  );
}
