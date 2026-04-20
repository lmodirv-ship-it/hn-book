import React from "react";
import { Button } from "@/components/ui/button";
import hnLogo from "@/assets/hn-logo.jpeg";
import { ShoppingCart, Menu, X, Globe, LogOut, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, locales } from "@/lib/i18n";
import { authService } from "@/services/authService";

interface NavbarProps {
  categories?: string[];
  activeCategory?: string;
  onCategorySelect?: (cat: string) => void;
  productCounts?: Record<string, number>;
}

const CATEGORY_LABELS: Record<string, string> = {
  "All": "الكل",
  "كتب": "كتب",
  "بطاقات": "بطاقات",
  "قوالب": "نماذج",
  "صور": "صور",
  "وثائق": "وثائق",
  "عروض": "عروض",
  "أخرى": "أخرى",
};

const Navbar = ({ categories, activeCategory, onCategorySelect, productCounts }: NavbarProps) => {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const result = await authService.getSession();
      if (!mounted) return;
      setUser(result.data ? { id: result.data.user.id, email: result.data.user.email } : null);

      if (result.data) {
        const admin = await authService.hasRole(result.data.user.id, "admin");
        if (mounted) setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }
    };

    syncSession();

    const unsubscribe = authService.onAuthStateChange(async (_event, user) => {
      if (!mounted) return;
      setUser(user ? { id: user.id, email: user.email } : null);

      if (user) {
        const admin = await authService.hasRole(user.id, "admin");
        if (mounted) setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setIsAdmin(false);
    navigate("/");
  };

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
    { href: "/books", label: "📚 كتب" },
    { href: "/carte-visite", label: "🪪 بطاقات" },
    { href: "/tablou", label: "🖼️ لوحات" },
    { href: "/studio", label: "✨ استوديو" },
  ];

  const allCategories = categories ? ["All", ...categories] : [];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-glow shadow-[0_1px_20px_-8px_rgba(0,0,0,0.45)]" : "bg-transparent"
      }`}
      style={{ borderBottom: scrolled ? undefined : "none" }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="logo-glow flex flex-col items-center">
            <img
              src={hnLogo}
              alt="HN Groupe"
              className="h-20 w-20 rounded-full object-cover transition-transform duration-300 group-hover:scale-110 ring-2 ring-primary/40"
            />
          </div>
          <span className="nav-glow-btn rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border border-primary/50 bg-primary/20 transition-transform duration-200">
            HN-BOOK
          </span>
        </Link>

        <nav className="hidden items-center md:flex absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 glass-future">
            <div className="flex items-center gap-1 rounded-xl px-1.5 py-1 bg-primary/10 border border-primary/30 shadow-[0_0_20px_-5px_hsl(199,89%,48%,0.15)]">
              {navLinks.map((link, idx) => (
                <React.Fragment key={link.href}>
                  <button
                    onClick={() => navigate(link.href)}
                    className="nav-glow-green rounded-lg px-3 py-1.5 text-[11px] font-semibold text-foreground border border-emerald-500/50 bg-emerald-500/20 transition-transform duration-200"
                  >
                    {link.label}
                  </button>

                  {idx === 0 && (
                    <div className="relative" ref={langRef}>
                      <button
                        onClick={() => setLangOpen(!langOpen)}
                        className="nav-glow-btn rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white border border-primary/50 bg-primary/20 flex items-center gap-1 transition-transform duration-200"
                      >
                        <Globe className="h-3 w-3" />
                        {locales.find((l) => l.code === locale)?.flag}
                      </button>

                      <AnimatePresence>
                        {langOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute start-0 top-full mt-2 w-36 rounded-xl p-1.5 shadow-dramatic bg-card border border-border/40 z-50"
                          >
                            {locales.map((l) => (
                              <button
                                key={l.code}
                                onClick={() => {
                                  setLocale(l.code);
                                  setLangOpen(false);
                                }}
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
                  )}
                </React.Fragment>
              ))}

              {user ? (
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border border-destructive/50 bg-destructive/20 flex items-center gap-1 transition-transform duration-200 hover:scale-105"
                >
                  <LogOut className="h-3 w-3" />
                  خروج
                </button>
              ) : (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/auth");
                  }}
                  className="nav-glow-btn rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border border-primary/50 bg-primary/20 transition-transform duration-200"
                >
                  {t("nav.getStarted")}
                </a>
              )}
            </div>

            {allCategories.length > 0 && (
              <div className="flex items-center gap-1 rounded-xl px-1.5 py-1 bg-primary/10 border border-primary/30 shadow-[0_0_20px_-5px_hsl(199,89%,48%,0.15)]">
                {allCategories.map((cat) => {
                  const isActive = activeCategory === cat;
                  const label = CATEGORY_LABELS[cat] || cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        if (cat === "All") {
                          navigate("/");
                          onCategorySelect?.(cat);
                        } else {
                          navigate(`/category/${encodeURIComponent(cat)}`);
                        }
                      }}
                      className={`nav-glow-btn rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border bg-primary/20 transition-transform duration-200 ${
                        isActive ? "border-primary/80 shadow-[0_0_22px_-6px_hsl(199,89%,48%,0.35)]" : "border-primary/50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="hidden items-center gap-2.5 md:flex shrink-0">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40"
              onClick={() => navigate(isAdmin ? "/admin" : "/profile")}
            >
              <User className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40" onClick={() => navigate("/cart")}>
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground animate-scale-in">
                {itemCount}
              </span>
            )}
          </Button>
        </div>

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
            className="overflow-hidden bg-card/95 md:hidden"
            style={{ borderTop: "1px solid hsl(199 89% 48% / 0.08)" }}
          >
            <nav className="flex flex-col gap-1.5 px-4 py-3">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    navigate(link.href);
                    setMobileOpen(false);
                  }}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-foreground transition-all duration-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 text-right"
                >
                  {link.label}
                </button>
              ))}

              {allCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {allCategories.map((cat) => {
                    const isActive = activeCategory === cat;
                    const label = CATEGORY_LABELS[cat] || cat;

                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          if (cat === "All") {
                            navigate("/");
                            onCategorySelect?.(cat);
                          } else {
                            navigate(`/category/${encodeURIComponent(cat)}`);
                          }
                          setMobileOpen(false);
                        }}
                        className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-300 ${
                          isActive
                            ? "bg-primary/25 text-white border border-primary/50 shadow-[0_0_20px_-4px_hsl(199,89%,48%,0.4)]"
                            : "bg-primary/8 text-white/80 border border-primary/15 hover:bg-primary/20 hover:text-white hover:border-primary/35"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-1.5 mt-1">
                {locales.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLocale(l.code);
                    }}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-300 ${
                      locale === l.code
                        ? "bg-primary/25 text-white border border-primary/50 shadow-[0_0_15px_-3px_hsl(199,89%,48%,0.3)]"
                        : "bg-primary/8 text-white/80 border border-primary/15 hover:bg-primary/20 hover:text-white"
                    }`}
                  >
                    {l.flag}
                  </button>
                ))}
              </div>

              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="mt-1 w-full rounded-xl px-4 py-3 text-sm font-semibold text-destructive transition-all duration-300 bg-destructive/10 border border-destructive/20 hover:bg-destructive/25 hover:border-destructive/40 flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  خروج
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigate("/auth");
                    setMobileOpen(false);
                  }}
                  className="mt-1 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300 bg-primary/10 border border-primary/20 hover:bg-primary/25 hover:border-primary/40 hover:shadow-[0_0_15px_-3px_hsl(199,89%,48%,0.3)]"
                >
                  {t("nav.getStarted")}
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
