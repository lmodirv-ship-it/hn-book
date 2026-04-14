import React from "react";
import { Button } from "@/components/ui/button";
import hnLogo from "@/assets/hn-logo.jpeg";
import { ShoppingCart, Menu, X, ArrowRight, Globe, Sparkles, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n, locales } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    { href: "#products", label: t("nav.products") },
    { href: "/books", label: "📚 كتب", isRoute: true },
    { href: "#features", label: t("nav.features") },
    { href: "#pricing", label: t("nav.pricing") },
  ];

  const allCategories = categories ? ["All", ...categories] : [];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-glow shadow-[0_1px_30px_-8px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      }`}
      style={{ borderBottom: scrolled ? undefined : 'none' }}
    >
      {/* Main navbar row */}
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <motion.div
            className="flex flex-col items-center"
            animate={{
              boxShadow: [
                "0 0 15px -2px hsl(199,89%,48%,0.3), 0 0 30px -5px hsl(199,89%,48%,0.15)",
                "0 0 30px -2px hsl(199,89%,48%,0.7), 0 0 60px -5px hsl(199,89%,48%,0.4)",
                "0 0 15px -2px hsl(199,89%,48%,0.3), 0 0 30px -5px hsl(199,89%,48%,0.15)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ borderRadius: "9999px" }}
          >
            <img src={hnLogo} alt="HN Groupe" className="h-20 w-20 rounded-full object-cover transition-transform duration-300 group-hover:scale-110 ring-2 ring-primary/40" />
          </motion.div>
          <motion.button
            onClick={() => {}}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border border-primary/50 bg-primary/20 backdrop-blur-sm"
            animate={{
              boxShadow: [
                "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                "inset 0 0 20px -2px hsl(199,89%,48%,0.7), 0 0 25px -2px hsl(199,89%,48%,0.5)",
                "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
              ],
              borderColor: [
                "hsl(199,89%,48%,0.4)",
                "hsl(199,89%,48%,0.8)",
                "hsl(199,89%,48%,0.4)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{
              boxShadow: "inset 0 0 25px -2px hsl(199,89%,48%,0.85), 0 0 35px -2px hsl(199,89%,48%,0.6)",
              borderColor: "hsl(199,89%,48%,0.9)",
              scale: 1.05,
            }}
          >
            HN-BOOK
          </motion.button>
        </Link>

        {/* Desktop nav: nested box buttons */}
        <nav className="hidden items-center md:flex absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 bg-black/80 backdrop-blur-xl border border-primary/20 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.7),0_0_25px_-5px_hsl(199,89%,48%,0.15)]">
            {/* Pages box */}
            <div className="flex items-center gap-1 rounded-xl px-1.5 py-1 bg-primary/10 border border-primary/30 shadow-[0_0_25px_-3px_hsl(199,89%,48%,0.2),inset_0_0_15px_-3px_hsl(199,89%,48%,0.1)]">
              {navLinks.map((link, idx) => (
                <React.Fragment key={link.href}>
                  {link.isRoute ? (
                    <motion.button
                      onClick={() => navigate(link.href)}
                      className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border border-emerald-500/50 bg-emerald-500/20 backdrop-blur-sm"
                      animate={{
                        boxShadow: [
                          "inset 0 0 8px -2px rgba(16,185,129,0.3), 0 0 10px -2px rgba(16,185,129,0.2)",
                          "inset 0 0 20px -2px rgba(16,185,129,0.7), 0 0 25px -2px rgba(16,185,129,0.5)",
                          "inset 0 0 8px -2px rgba(16,185,129,0.3), 0 0 10px -2px rgba(16,185,129,0.2)",
                        ],
                        borderColor: [
                          "rgba(16,185,129,0.4)",
                          "rgba(16,185,129,0.8)",
                          "rgba(16,185,129,0.4)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 }}
                      whileHover={{
                        boxShadow: "inset 0 0 25px -2px rgba(16,185,129,0.85), 0 0 35px -2px rgba(16,185,129,0.6)",
                        borderColor: "rgba(16,185,129,0.9)",
                        scale: 1.05,
                      }}
                    >
                      {link.label}
                    </motion.button>
                  ) : (
                    <motion.a
                      href={link.href}
                      className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border border-primary/50 bg-primary/20 backdrop-blur-sm"
                      animate={{
                        boxShadow: [
                          "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                          "inset 0 0 20px -2px hsl(199,89%,48%,0.7), 0 0 25px -2px hsl(199,89%,48%,0.5)",
                          "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                        ],
                        borderColor: [
                          "hsl(199,89%,48%,0.4)",
                          "hsl(199,89%,48%,0.8)",
                          "hsl(199,89%,48%,0.4)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: idx * 0.3 }}
                      whileHover={{
                        boxShadow: "inset 0 0 25px -2px hsl(199,89%,48%,0.85), 0 0 35px -2px hsl(199,89%,48%,0.6)",
                        borderColor: "hsl(199,89%,48%,0.9)",
                        scale: 1.05,
                      }}
                    >
                      {link.label}
                    </motion.a>
                  )}
                  {idx === 0 && (
                    <div className="relative" ref={langRef}>
                      <motion.button
                        onClick={() => setLangOpen(!langOpen)}
                        className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white border border-primary/50 bg-primary/20 backdrop-blur-sm flex items-center gap-1"
                        animate={{
                          boxShadow: [
                            "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                            "inset 0 0 20px -2px hsl(199,89%,48%,0.7), 0 0 25px -2px hsl(199,89%,48%,0.5)",
                            "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                          ],
                          borderColor: [
                            "hsl(199,89%,48%,0.4)",
                            "hsl(199,89%,48%,0.8)",
                            "hsl(199,89%,48%,0.4)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                        whileHover={{
                          boxShadow: "inset 0 0 25px -2px hsl(199,89%,48%,0.85), 0 0 35px -2px hsl(199,89%,48%,0.6)",
                          borderColor: "hsl(199,89%,48%,0.9)",
                          scale: 1.05,
                        }}
                      >
                        <Globe className="h-3 w-3" />
                        {locales.find(l => l.code === locale)?.flag}
                      </motion.button>
                      <AnimatePresence>
                        {langOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute start-0 top-full mt-2 w-36 rounded-xl p-1.5 shadow-dramatic bg-card/95 backdrop-blur-2xl border border-border/40 z-50"
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
                  )}
                </React.Fragment>
              ))}
              {user ? (
                <motion.button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border border-destructive/50 bg-destructive/20 backdrop-blur-sm flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                >
                  <LogOut className="h-3 w-3" />
                  خروج
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => navigate("/auth")}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border border-primary/50 bg-primary/20 backdrop-blur-sm"
                  animate={{
                    boxShadow: [
                      "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                      "inset 0 0 20px -2px hsl(199,89%,48%,0.7), 0 0 25px -2px hsl(199,89%,48%,0.5)",
                      "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                    ],
                    borderColor: [
                      "hsl(199,89%,48%,0.4)",
                      "hsl(199,89%,48%,0.8)",
                      "hsl(199,89%,48%,0.4)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
                  whileHover={{
                    boxShadow: "inset 0 0 25px -2px hsl(199,89%,48%,0.85), 0 0 35px -2px hsl(199,89%,48%,0.6)",
                    borderColor: "hsl(199,89%,48%,0.9)",
                    scale: 1.05,
                  }}
                >
                  {t("nav.getStarted")}
                </motion.button>
              )}
            </div>

            {/* Categories box */}
            {allCategories.length > 0 && (
              <div className="flex items-center gap-1 rounded-xl px-1.5 py-1 bg-primary/10 border border-primary/30 shadow-[0_0_25px_-3px_hsl(199,89%,48%,0.2),inset_0_0_15px_-3px_hsl(199,89%,48%,0.1)]">
                {allCategories.map((cat) => {
                  const isActive = activeCategory === cat;
                  const label = CATEGORY_LABELS[cat] || cat;
                  return (
                    <motion.button
                      key={cat}
                      onClick={() => {
                        if (cat === "All") {
                          navigate("/");
                          onCategorySelect?.(cat);
                        } else {
                          navigate(`/category/${encodeURIComponent(cat)}`);
                        }
                      }}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white border bg-primary/20 backdrop-blur-sm ${
                        isActive ? "border-primary/80" : "border-primary/50"
                      }`}
                      animate={{
                        boxShadow: isActive
                          ? [
                              "inset 0 0 15px -2px hsl(199,89%,48%,0.5), 0 0 20px -2px hsl(199,89%,48%,0.4)",
                              "inset 0 0 25px -2px hsl(199,89%,48%,0.85), 0 0 35px -2px hsl(199,89%,48%,0.65)",
                              "inset 0 0 15px -2px hsl(199,89%,48%,0.5), 0 0 20px -2px hsl(199,89%,48%,0.4)",
                            ]
                          : [
                              "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                              "inset 0 0 20px -2px hsl(199,89%,48%,0.7), 0 0 25px -2px hsl(199,89%,48%,0.5)",
                              "inset 0 0 8px -2px hsl(199,89%,48%,0.3), 0 0 10px -2px hsl(199,89%,48%,0.2)",
                            ],
                        borderColor: isActive
                          ? ["hsl(199,89%,48%,0.7)", "hsl(199,89%,48%,1)", "hsl(199,89%,48%,0.7)"]
                          : ["hsl(199,89%,48%,0.4)", "hsl(199,89%,48%,0.8)", "hsl(199,89%,48%,0.4)"],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      whileHover={{
                        boxShadow: "inset 0 0 25px -2px hsl(199,89%,48%,0.85), 0 0 35px -2px hsl(199,89%,48%,0.6)",
                        borderColor: "hsl(199,89%,48%,0.9)",
                        scale: 1.05,
                      }}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2.5 md:flex shrink-0">

          <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40">
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
              0
            </span>
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


      {/* Mobile menu */}
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
            <nav className="flex flex-col gap-1.5 px-4 py-3">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <button
                    key={link.href}
                    onClick={() => { navigate(link.href); setMobileOpen(false); }}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 backdrop-blur-sm text-right"
                  >
                    {link.label}
                  </button>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300 bg-primary/10 border border-primary/20 hover:bg-primary/25 hover:border-primary/40 hover:shadow-[0_0_15px_-3px_hsl(199,89%,48%,0.3)] backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              ))}

              {/* Mobile categories */}
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
                        className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-300 backdrop-blur-sm ${
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
                    onClick={() => { setLocale(l.code); }}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-300 backdrop-blur-sm ${
                      locale === l.code
                        ? "bg-primary/25 text-white border border-primary/50 shadow-[0_0_15px_-3px_hsl(199,89%,48%,0.3)]"
                        : "bg-primary/8 text-white/80 border border-primary/15 hover:bg-primary/20 hover:text-white"
                    }`}
                  >
                    {l.flag}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { navigate("/auth"); setMobileOpen(false); }}
                className="mt-1 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300 bg-primary/10 border border-primary/20 hover:bg-primary/25 hover:border-primary/40 hover:shadow-[0_0_15px_-3px_hsl(199,89%,48%,0.3)] backdrop-blur-sm"
              >
                {t("nav.getStarted")}
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
