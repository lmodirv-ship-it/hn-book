import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { href: "#products", label: "Products" },
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
  ];

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
            <span className="text-[10px] font-bold text-primary-foreground">TV</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Template<span className="text-primary">Vault</span>
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
            Get Started
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
              <Button size="sm" className="mt-2 w-full gap-1 rounded-md bg-primary text-primary-foreground border-0 text-xs">
                Get Started <ArrowRight className="h-3 w-3" />
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
