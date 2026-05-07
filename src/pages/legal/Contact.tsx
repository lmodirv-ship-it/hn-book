import { useState } from "react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Contact = () => {
  const [sending, setSending] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const subject = encodeURIComponent(`[HN Book] ${data.get("subject") || "Contact"}`);
    const body = encodeURIComponent(
      `Name: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`
    );
    window.location.href = `mailto:support@hn-groupe.com?subject=${subject}&body=${body}`;
    toast.success("Opening your email client…");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-sm text-muted-foreground mb-8">
          We usually reply within 1–2 business days.
        </p>

        <div className="glass-future rounded-2xl p-6 mb-8">
          <p className="text-foreground/90 mb-2">
            <strong>Email:</strong>{" "}
            <a className="text-primary underline" href="mailto:support@hn-groupe.com">
              support@hn-groupe.com
            </a>
          </p>
          <p className="text-foreground/90">
            <strong>Company:</strong> HN Groupe SARL
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="name">Name</label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="email">Email</label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="subject">Subject</label>
            <Input id="subject" name="subject" required />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="message">Message</label>
            <Textarea id="message" name="message" rows={6} required />
          </div>
          <Button type="submit" disabled={sending} className="w-full">
            {sending ? "Sending…" : "Send Message"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
