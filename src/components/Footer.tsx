import { useI18n } from "@/lib/i18n";
import { ExternalLink } from "lucide-react";

const hnSites = [
  { name: "HN Book", href: "#", current: true },
  { name: "Souk HN", href: "https://souk-hn.lovable.app" },
  { name: "HN Driver", href: "https://hn-driver.com" },
];

const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="py-10" style={{ borderTop: '1px solid hsl(190 90% 50% / 0.12)' }}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent shadow-glow-accent">
              <span className="text-xs font-bold text-accent-foreground">HN</span>
            </div>
            <span className="text-sm font-bold text-foreground">
              HN <span className="text-primary">Book</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground/60">مواقعنا:</span>
            {hnSites.map((site) => (
              <a
                key={site.name}
                href={site.href}
                target={site.current ? undefined : "_blank"}
                rel={site.current ? undefined : "noopener noreferrer"}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  site.current
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {site.name}
                {!site.current && <ExternalLink className="h-3 w-3" />}
              </a>
            ))}
          </div>

          <nav className="flex gap-6 text-sm text-muted-foreground">
            {[
              { key: "footer.terms", label: t("footer.terms") },
              { key: "footer.privacy", label: t("footer.privacy") },
              { key: "footer.support", label: t("footer.support") },
            ].map((item) => (
              <a key={item.key} href="#" className="transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 text-center text-xs text-muted-foreground/50" style={{ borderTop: '1px solid hsl(190 90% 50% / 0.08)' }}>
          © {new Date().getFullYear()} HN Book — HN Groupe. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
