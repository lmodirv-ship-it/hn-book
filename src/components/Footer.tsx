import { Crown } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="relative border-t border-border/50 py-14">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/3 to-transparent -z-10" />

      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Crown className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-gradient-static">
                TemplateVault
              </span>
              <p className="text-xs text-muted-foreground/60">
                Premium digital products for professionals
              </p>
            </div>
          </div>

          <nav className="flex gap-8 text-sm text-muted-foreground/60">
            {["Terms", "Privacy", "Support", "Contact"].map((label) => (
              <a
                key={label}
                href="#"
                className="transition-colors duration-300 hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-border/30 pt-6 text-center text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} TemplateVault. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
