import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Notice</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-6 text-foreground/90 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">1. Who we are</h2>
            <p><strong>HN Groupe SARL</strong> is the data controller responsible for personal data collected through this service.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">2. Data we collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account data:</strong> name, email, password (hashed), phone (optional).</li>
              <li><strong>Profile & content:</strong> uploads, designs, orders, support messages.</li>
              <li><strong>Usage & device:</strong> IP address, browser, device identifiers, telemetry, log data.</li>
              <li><strong>Cookies:</strong> essential session cookies and analytics where applicable.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">3. Why we use it (purposes & legal bases)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and operate your account — <em>contract performance</em>.</li>
              <li>To provide the service and process orders — <em>contract performance</em>.</li>
              <li>To prevent fraud and secure the service — <em>legitimate interests</em>.</li>
              <li>To improve and analyze the product — <em>legitimate interests</em>.</li>
              <li>To send service emails — <em>contract</em>; marketing emails — <em>consent</em> (you can opt out anytime).</li>
              <li>To comply with legal obligations — <em>legal obligation</em>.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">4. Sharing</h2>
            <p>We share data only with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Service providers / subprocessors</strong> — hosting, database, email, analytics, customer support tools.</li>
              <li><strong>Paddle.com</strong> — our Merchant of Record, for sale of products, subscription management, payments, tax compliance, and invoicing.</li>
              <li><strong>Professional advisers</strong> — legal, accounting, when needed.</li>
              <li><strong>Authorities</strong> — where required by law.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">5. International transfers</h2>
            <p>Where data is transferred outside your country/region, we rely on appropriate safeguards such as Standard Contractual Clauses or adequacy decisions.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">6. Retention</h2>
            <p>We keep data only as long as needed for the purposes above or as required by law, then delete or anonymize it. Account data is kept while the account is active and for a reasonable period afterwards.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">7. Your rights</h2>
            <p>Subject to applicable law, you may request access, rectification, erasure, restriction, portability, or object to processing, and withdraw consent at any time. EU/UK users may lodge a complaint with their supervisory authority. We respond within one month.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">8. Security</h2>
            <p>We implement appropriate technical and organizational measures including encryption in transit, access controls, and monitoring.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">9. Cookies</h2>
            <p>We use essential cookies for authentication and session management. Analytics or marketing cookies, if any, are subject to your consent and can be managed in your browser settings.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mt-6 mb-2">10. Contact</h2>
            <p>For privacy requests, contact HN Groupe SARL via the support channels listed on our site.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
