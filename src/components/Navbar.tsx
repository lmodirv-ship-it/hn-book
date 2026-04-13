import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, ArrowRight, Globe, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, locales } from "@/lib/i18n";

const Navbar = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { href: "#products", label: t("nav.products") },
    { href: "#features", label: t("nav.features") },
    { href: "#pricing", label: t("nav.pricing") },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/70 backdrop-blur-2xl shadow-[0_1px_30px_-8px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      }`}
      style={{ borderBottom: scrolled ? '1px solid hsl(199 89% 48% / 0.08)' : 'none' }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-glow-accent transition-transform duration-300 group-hover:scale-105">
            <span className="text-[10px] font-black text-accent-foreground tracking-tighter">HN</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground leading-tight">
              HN <span className="text-primary">BOOK</span>
            </span>
            <span className="text-[8px] text-muted-foreground uppercase tracking-[0.25em]">Digital Library</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full px-1.5 py-1 bg-card/50 backdrop-blur-xl border border-border/30">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-5 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/50"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          {/* Language switcher */}
          <div className="relative" ref={langRef}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40"
              onClick={() => setLangOpen(!langOpen)}
            >
              <Globe className="h-4 w-4" />
            </Button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute end-0 top-full mt-2 w-36 rounded-xl p-1.5 shadow-dramatic bg-card/95 backdrop-blur-2xl border border-border/40"
                >
                  {locales.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLocale(l.code); setLangOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-muted/50 ${
                        locale === l.code ? "text-primary font-medium bg-primary/5" : "text-foreground"
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40">
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
              0
            </span>
          </Button>

          <Button
            className="h-9 gap-1.5 rounded-full bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-xs font-bold hover:from-accent/90 hover:to-accent/70 border-0 px-5 shadow-glow-accent transition-all duration-300 hover:shadow-[0_6px_24px_-4px_hsl(25,95%,53%,0.5)]"
            onClick={() => navigate("/auth")}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("nav.getStarted")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-background/95 backdrop-blur-2xl md:hidden"
            style={{ borderTop: '1px solid hsl(199 89% 48% / 0.08)' }}
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex gap-1 mt-2 px-1">
                {locales.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLocale(l.code); }}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      locale === l.code
                        ? "bg-primary/10 text-primary font-medium border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    {l.flag}
                  </button>
                ))}
              </div>
              <Button
                className="mt-3 w-full gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground border-0 text-xs font-bold shadow-glow-accent"
                onClick={() => { navigate("/auth"); setMobileOpen(false); }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("nav.getStarted")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
