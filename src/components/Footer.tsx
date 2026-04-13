const Footer = () => {
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
            {["Terms", "Privacy", "Support"].map((label) => (
              <a key={label} href="#" className="transition-colors hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-border/20 pt-6 text-center text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} TemplateVault. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
