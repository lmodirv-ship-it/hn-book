import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, Zap, Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { href: "#products", label: "Products" },
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
  ];

  return (
    <>
      {/* Announcement banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] py-2 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-primary-foreground">
          <Sparkles className="h-3 w-3" />
          <span>🔥 Flash Sale — Up to 97% OFF all digital products!</span>
          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] px-1.5 py-0 border-0">
            Limited Time
          </Badge>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass border-b shadow-lg shadow-background/50"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5">
            <motion.div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Crown className="h-4.5 w-4.5 text-primary-foreground" />
            </motion.div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-gradient-static">TemplateVault</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-3/4" />
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-muted">
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-glow">
                0
              </span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 border-0"
            >
              <Zap className="h-3.5 w-3.5" />
              Get Started
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-border/50 glass md:hidden"
            >
              <nav className="flex flex-col gap-1 px-4 py-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-4 py-3 text-sm font-medium transition-all hover:bg-muted"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <Button size="sm" className="mt-3 w-full gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent border-0">
                  <Zap className="h-3.5 w-3.5" />
                  Get Started
                </Button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

export default Navbar;
