import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-invert">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-6 text-foreground/90 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Who we are</h2>
            <p>This service is operated by <strong>HN Groupe SARL</strong> ("we", "us", "our"). By accessing or using our service, you agree to be bound by these Terms of Service.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Acceptance</h2>
            <p>By creating an account, browsing, or purchasing on our site, you agree to these Terms. If you do not agree, please do not use the service.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Account & accuracy</h2>
            <p>You must provide accurate information, keep your credentials confidential, and are responsible for activity under your account. If you act on behalf of an organization, you confirm you have authority to bind it. Individual users must be of legal age.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Acceptable use</h2>
            <p>You must not misuse the service, including: any unlawful use, fraud, spam, infringement of intellectual property, uploading malware, probing or scraping, or interfering with security or availability.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. Intellectual property</h2>
            <p>HN Groupe SARL retains all rights, title, and interest in the service, including software, documentation, and branding. We grant you a limited, non-exclusive, non-transferable right to use the service within your selected plan. You may not reverse-engineer, resell, redistribute, or circumvent technical limits.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. User content</h2>
            <p>You retain ownership of content you upload. You grant us a limited license to host and process it solely to provide the service.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Service availability</h2>
            <p>We strive to keep the service available but do not guarantee uninterrupted or error-free performance. To the fullest extent permitted by law, we disclaim all implied warranties including merchantability and fitness for a particular purpose.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. Payments & subscriptions</h2>
            <p>Our order process is conducted by our online reseller <strong>Paddle.com</strong>. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. Payment, billing, taxes, renewals, cancellations and refund mechanics are governed by the <a className="text-primary underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">Paddle Buyer Terms</a>.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">9. Suspension & termination</h2>
            <p>We may suspend or terminate access for material breach, non-payment, security or fraud risk, or repeated/serious policy violations. On termination, your access ends; you may request export of your data within a reasonable window before deletion.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">10. Liability</h2>
            <p>To the maximum extent permitted by law, our aggregate liability is capped at the fees you paid in the 12 months preceding the claim. We exclude liability for indirect, consequential, or special damages (loss of profits, data, or goodwill). Nothing limits liability for fraud, death, or personal injury where the law prohibits such limitation.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">11. Indemnity</h2>
            <p>You agree to indemnify HN Groupe SARL against claims arising from your content, unlawful use, or breach of these Terms.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">12. Governing law</h2>
            <p>These Terms are governed by the laws of the jurisdiction in which HN Groupe SARL is established. Disputes will be resolved by the competent courts of that jurisdiction.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">13. Changes & assignment</h2>
            <p>We may update these Terms; continued use constitutes acceptance. You may not assign these Terms without our consent; we may assign in connection with a merger or acquisition.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">14. Force majeure</h2>
            <p>Neither party is liable for delays caused by events beyond reasonable control.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">15. Contact</h2>
            <p>Questions about these Terms: contact HN Groupe SARL via the support channels listed on our site.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
