import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, MousePointerClick, Pencil, Truck, ShieldCheck, Zap, Award, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

type TemplatePreview = {
  id: string;
  name: string;
  preview_image_url: string | null;
  category: string;
};

const steps = [
  {
    icon: MousePointerClick,
    title: "Choose a design",
    desc: "Pick from premium, ready-to-use card templates crafted by designers.",
  },
  {
    icon: Pencil,
    title: "Edit your info",
    desc: "Update name, title, contact and brand colors in our live editor.",
  },
  {
    icon: Truck,
    title: "Order and print",
    desc: "We print on premium stock and deliver straight to your door.",
  },
];

const trust = [
  { icon: Award, title: "High-quality printing", desc: "Premium 350gsm stock with rich gold and matte finishes." },
  { icon: Zap, title: "Fast delivery", desc: "Most orders ship within 48 hours, tracked all the way." },
  { icon: ShieldCheck, title: "Professional service", desc: "Real humans, real support, every step of the way." },
];

const pricing = [
  {
    qty: 10,
    label: "Starter",
    price: 19,
    perks: ["10 premium cards", "Single-sided print", "Standard delivery"],
  },
  {
    qty: 50,
    label: "Professional",
    price: 59,
    perks: ["50 premium cards", "Front & back print", "Priority delivery", "Free design tweaks"],
    featured: true,
  },
  {
    qty: 100,
    label: "Business",
    price: 99,
    perks: ["100 premium cards", "Front & back print", "Express delivery", "Free design tweaks", "Dedicated support"],
  },
];

const Landing = () => {
  const [templates, setTemplates] = useState<TemplatePreview[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("svg_templates")
        .select("id,name,preview_image_url,category")
        .eq("is_active", true)
        .limit(6);
      if (data) setTemplates(data as TemplatePreview[]);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground noise-bg">
      {/* Top nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-serif italic text-primary">HN</span>
            <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Studio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#templates" className="hover:text-foreground transition-colors">Templates</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            <Link to="/templates">Start Designing</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-70 pointer-events-none" />
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-primary/10 orb orb-1" />
        <div className="absolute top-40 -right-20 w-[28rem] h-[28rem] bg-primary/5 orb orb-2" />

        <div className="relative container mx-auto px-4 pt-24 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-subtle text-xs uppercase tracking-[0.2em] text-primary/90 mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            Premium design & print
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif leading-[1.05] max-w-5xl mx-auto animate-fade-in">
            Design and print your <span className="text-gradient italic">card</span> in minutes
          </h1>

          <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-in">
            Choose a luxury template, personalize it in our live editor, and we'll print and deliver
            premium business cards that make you unforgettable.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
            <Button asChild size="lg" className="h-14 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-accent group">
              <Link to="/templates">
                Start Designing
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base border-primary/30 hover:border-primary/60 hover:bg-primary/5">
              <a href="#how">See how it works</a>
            </Button>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
            <span>★★★★★ 4.9 customer rating</span>
            <span className="hidden sm:inline">•</span>
            <span>10,000+ cards delivered</span>
            <span className="hidden sm:inline">•</span>
            <span>48h shipping</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-serif">Three steps to a card you love</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <Card key={s.title} className="glass-card glass-card-hover p-8 transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-10 h-10 rounded-full border border-primary/40 flex items-center justify-center text-primary font-serif">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <s.icon className="w-5 h-5 text-primary/70" />
                </div>
                <h3 className="text-2xl font-serif mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Templates showcase */}
      <section id="templates" className="relative py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">Top templates</p>
              <h2 className="text-4xl md:text-5xl font-serif max-w-xl">Designs your clients will remember</h2>
            </div>
            <Button asChild variant="outline" className="border-primary/30 hover:border-primary/60 hover:bg-primary/5 self-start md:self-auto">
              <Link to="/templates">Browse all templates <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[1.7/1] rounded-lg glass-subtle animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((t) => (
                <Card key={t.id} className="group overflow-hidden glass-card glass-card-hover transition-all duration-500">
                  <div className="aspect-[1.7/1] relative overflow-hidden bg-muted">
                    {t.preview_image_url ? (
                      <img
                        src={t.preview_image_url}
                        alt={t.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        {t.name}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-5">
                      <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link to={`/editor/${t.id}`}>Edit Design <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                      </Button>
                    </div>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <p className="font-serif text-lg">{t.name}</p>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{t.category}</p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                      <Link to={`/editor/${t.id}`}>Edit</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-serif">Simple, transparent packages</h2>
            <p className="mt-4 text-muted-foreground">No hidden fees. Free design edits on every package.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricing.map((p) => (
              <Card
                key={p.qty}
                className={`p-8 transition-all duration-300 relative ${
                  p.featured
                    ? "glass-glow border-primary/50 md:scale-105"
                    : "glass-card glass-card-hover"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] uppercase tracking-[0.2em] bg-primary text-primary-foreground rounded-full">
                    Most popular
                  </span>
                )}
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{p.label}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-serif text-primary">${p.price}</span>
                  <span className="text-sm text-muted-foreground">/ {p.qty} cards</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`w-full mt-8 ${
                    p.featured
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <Link to="/templates">Choose {p.label}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="relative py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {trust.map((t) => (
              <div key={t.title} className="p-8 rounded-lg glass-subtle">
                <t.icon className="w-7 h-7 text-primary mb-5" />
                <h3 className="text-xl font-serif mb-2">{t.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-28 border-t border-border/30 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />
        <div className="relative container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-serif leading-tight">
            Your next card is <span className="text-gradient italic">minutes</span> away
          </h2>
          <p className="mt-6 text-muted-foreground text-lg">
            Join thousands of professionals printing with HN Studio.
          </p>
          <Button asChild size="lg" className="mt-10 h-14 px-10 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-accent">
            <Link to="/templates">Start Designing <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
