import { useI18n } from "@/lib/i18n";
import { ExternalLink, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import hnLogo from "@/assets/hn-logo.jpeg";

const hnSites = [
  { name: "HN Book", href: "#", current: true },
  { name: "Souk HN", href: "https://souk-hn.lovable.app" },
  { name: "HN Driver", href: "https://hn-driver.com" },
];

const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="relative py-12 border-t border-border/15">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img src={hnLogo} alt="HN Studio" className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/40" />
            <span className="text-sm font-semibold tracking-wide text-foreground">
              HN <span className="text-primary font-serif italic">Studio</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground/50">مواقعنا:</span>
            {hnSites.map((site) => (
              <a
                key={site.name}
                href={site.href}
                target={site.current ? undefined : "_blank"}
                rel={site.current ? undefined : "noopener noreferrer"}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  site.current
                    ? "text-primary font-medium"
                    : "text-muted-foreground/60 hover:text-foreground"
                }`}
              >
                {site.name}
                {!site.current && <ExternalLink className="h-2.5 w-2.5" />}
              </a>
            ))}
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground/60">
            <Link to="/legal/terms" className="transition-colors hover:text-foreground">
              {t("footer.terms")}
            </Link>
            <Link to="/legal/privacy" className="transition-colors hover:text-foreground">
              {t("footer.privacy")}
            </Link>
            <Link to="/legal/refund" className="transition-colors hover:text-foreground">
              Refund Policy
            </Link>
            <a href="mailto:support@hn-groupe.com" className="transition-colors hover:text-foreground">
              {t("footer.support")}
            </a>
          </nav>
        </div>

        <div className="mt-8 pt-6 text-center text-xs text-muted-foreground/40 border-t border-border/10">
          <span className="flex items-center justify-center gap-1.5">
            © {new Date().getFullYear()} HN Book — HN Groupe. {t("footer.rights")}
            <Heart className="h-3 w-3 text-accent/50" />
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
