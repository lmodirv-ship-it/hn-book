import { useI18n } from "@/lib/i18n";

const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border/30 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <span className="text-xs font-bold text-primary-foreground">TV</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              Template<span className="text-primary">Vault</span>
            </span>
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

        <div className="mt-8 border-t border-border/20 pt-6 text-center text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} TemplateVault. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
