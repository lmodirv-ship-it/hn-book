import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, ArrowRight, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, locales } from "@/lib/i18n";

const Navbar = () => {
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

  const currentLocale = locales.find((l) => l.code === locale);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/70 backdrop-blur-xl border-b border-border/30 shadow-[0_1px_20px_-6px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-[10px] font-bold text-primary-foreground">HN</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            HN<span className="text-primary"> Book</span>
          </span>
        </Link>

        {/* Desktop nav - centered */}
        <nav className="hidden items-center gap-0.5 md:flex absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/30"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1.5 md:flex">
          {/* Language switcher */}
          <div className="relative" ref={langRef}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md gap-1"
              onClick={() => setLangOpen(!langOpen)}
            >
              <Globe className="h-3.5 w-3.5" />
            </Button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute end-0 top-full mt-1 w-36 rounded-lg border border-border/40 bg-card/95 backdrop-blur-xl p-1 shadow-lg"
                >
                  {locales.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLocale(l.code); setLangOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted/40 ${
                        locale === l.code ? "text-primary font-medium" : "text-foreground"
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

          <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-md">
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
              0
            </span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 border-0 px-3"
          >
            {t("nav.getStarted")}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
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
            className="overflow-hidden border-t border-border/20 bg-background/80 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col gap-0.5 px-4 py-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/30"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              {/* Mobile language selector */}
              <div className="flex gap-1 mt-2 px-3">
                {locales.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLocale(l.code); }}
                    className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                      locale === l.code
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    {l.flag}
                  </button>
                ))}
              </div>
              <Button size="sm" className="mt-2 w-full gap-1 rounded-md bg-primary text-primary-foreground border-0 text-xs">
                {t("nav.getStarted")} <ArrowRight className="h-3 w-3" />
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
