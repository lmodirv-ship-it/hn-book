import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const Refund = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-6 text-foreground/90 leading-relaxed">
          <p>
            <strong>HN Groupe SARL</strong> offers a <strong>30-day money-back guarantee</strong>. If you are not satisfied
            with your purchase, you may request a full refund within 30 days of your order date.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">How to request a refund</h2>
          <p>
            Refunds are processed by our payment provider, <strong>Paddle</strong>, the Merchant of Record for all our orders.
            To request a refund:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Visit <a className="text-primary underline" href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a> and look up your order using the email used at checkout, or</li>
            <li>Contact our support team and we will assist with the request.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">Processing time</h2>
          <p>
            Approved refunds are typically returned to the original payment method within 5–10 business days,
            depending on your bank or card issuer.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">Subscriptions</h2>
          <p>
            You may cancel a subscription at any time from your billing portal. Cancellation stops future renewals;
            access remains active until the end of the current billing period.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">More information</h2>
          <p>
            See also Paddle's <a className="text-primary underline" href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">Refund Policy</a>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Refund;
