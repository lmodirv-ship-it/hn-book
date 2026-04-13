import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X, Zap, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Top banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] py-1.5 text-center text-xs font-medium text-primary-foreground">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-3 w-3" />
          <span>🔥 Flash Sale — Up to 97% OFF all digital products!</span>
          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] px-1.5 py-0">
            Limited Time
          </Badge>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Crown className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                TemplateVault
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "#products", label: "Products" },
              { href: "#features", label: "Features" },
              { href: "#pricing", label: "Pricing" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                0
              </span>
            </Button>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-accent font-semibold shadow-lg shadow-primary/20">
              <Zap className="h-3.5 w-3.5" />
              Get Started
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t bg-background px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {[
                { href: "#products", label: "Products" },
                { href: "#features", label: "Features" },
                { href: "#pricing", label: "Pricing" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Button size="sm" className="mt-2 w-full gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Get Started
              </Button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;
