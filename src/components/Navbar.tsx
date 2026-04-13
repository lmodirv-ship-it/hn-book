import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TemplateVault
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#products" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Templates
          </a>
          <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="icon">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <Button size="sm">Get Started</Button>
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
          <nav className="flex flex-col gap-4">
            <a href="#products" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>Templates</a>
            <a href="#features" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#pricing" className="text-sm font-medium" onClick={() => setMobileOpen(false)}>Pricing</a>
            <Button size="sm" className="w-full">Get Started</Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
