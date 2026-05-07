import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const Community = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Community Guidelines</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-6 text-foreground/90 leading-relaxed">
          <p>
            HN Book is a space for readers, learners and creators. To keep it safe and useful,
            everyone using the platform agrees to follow these guidelines.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">1. Be respectful</h2>
          <p>No harassment, hate speech, threats, or personal attacks. Treat others as you would like to be treated.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">2. No illegal content</h2>
          <p>
            Do not upload, share or request content that is illegal, infringes copyright, or violates the rights of others.
            This includes pirated books, malware, or stolen media.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">3. No adult or harmful content</h2>
          <p>
            Sexual content involving minors, graphic violence, self-harm promotion, or content that exploits vulnerable
            people is strictly prohibited and will be removed and reported.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">4. No spam or manipulation</h2>
          <p>
            Do not spam, scrape, run bots, fake reviews, or attempt to manipulate rankings, payments, or analytics.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">5. Protect privacy</h2>
          <p>
            Do not share other people's personal information without consent. Respect data protection laws including GDPR.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">6. Advertising & monetization</h2>
          <p>
            Pages on HN Book may display advertising (including Google AdSense). Content must comply with the
            <a className="text-primary underline mx-1" href="https://support.google.com/adsense/answer/48182" target="_blank" rel="noopener noreferrer">
              AdSense Program Policies
            </a>
            and must not encourage invalid clicks or misleading behavior.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">7. Reporting</h2>
          <p>
            If you see a violation, contact us via the{" "}
            <Link to="/legal/contact" className="text-primary underline">contact page</Link>.
            We review reports promptly.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">8. Enforcement</h2>
          <p>
            Violations may lead to content removal, warnings, suspension, or permanent termination of accounts,
            at our sole discretion. Serious violations may be reported to authorities.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Community;
