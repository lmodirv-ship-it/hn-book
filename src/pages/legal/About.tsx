import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">About HN Book</h1>
        <p className="text-sm text-muted-foreground mb-8">Part of the HN Groupe ecosystem</p>

        <section className="space-y-6 text-foreground/90 leading-relaxed">
          <p>
            <strong>HN Book</strong> is a digital reading and publishing platform built by <strong>HN Groupe SARL</strong>.
            Our mission is to make high-quality books, learning material, and creative tools accessible to everyone,
            with a clean, modern, and reliable experience.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">What we offer</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>A curated digital library with reader, bookmarks, highlights and notes.</li>
            <li>Print-on-demand and design tools for cards, posters and more.</li>
            <li>Secure accounts, orders and payments via trusted providers.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">Sister platforms</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><a className="text-primary underline" href="https://souk-hn.lovable.app" target="_blank" rel="noopener noreferrer">Souk HN</a> — marketplace.</li>
            <li><a className="text-primary underline" href="https://hn-driver.com" target="_blank" rel="noopener noreferrer">HN Driver</a> — mobility services.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
          <p>
            Questions or partnership ideas? Reach out via our <Link className="text-primary underline" to="/legal/contact">contact page</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
