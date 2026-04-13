import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Locale = "en" | "ar" | "fr" | "es";

export const locales: { code: Locale; label: string; flag: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
];

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Navbar
    "nav.products": "Products",
    "nav.features": "Features",
    "nav.pricing": "Pricing",
    "nav.getStarted": "Get Started",
    // Hero
    "hero.badge": "Digital Products Available",
    "hero.title1": "Build your",
    "hero.title2": "digital empire",
    "hero.desc": "Premium eBooks, courses, templates & AI tools — all with full resale rights. Buy once, sell forever.",
    "hero.browse": "Browse Products",
    "hero.learn": "Learn More",
    "hero.trust1": "Instant Download",
    "hero.trust2": "Full PLR/MRR Rights",
    "hero.trust3": "30-Day Guarantee",
    "hero.statProducts": "Products",
    "hero.statRights": "Full Rights",
    "hero.statAccess": "Instant Access",
    // Products section
    "products.search": "Search products...",
    "products.all": "All",
    "products.loadMore": "Load More",
    "products.empty": "No products found.",
    // Features
    "features.tag": "Why Choose Us",
    "features.title": "Everything you need to",
    "features.titleHighlight": "succeed",
    "features.instantDownload": "Instant Download",
    "features.instantDownloadDesc": "Get all your files immediately after purchase. No waiting.",
    "features.resaleRights": "Full Resale Rights",
    "features.resaleRightsDesc": "PLR & MRR included. Resell as your own, keep 100% profits.",
    "features.guarantee": "30-Day Guarantee",
    "features.guaranteeDesc": "Not happy? Full refund within 30 days, no questions asked.",
    "features.updates": "Lifetime Updates",
    "features.updatesDesc": "New products added regularly. Buy once, get updates forever.",
    // CTA
    "cta.tag": "Bundle Deal",
    "cta.title": "Get",
    "cta.titleHighlight": "everything",
    "cta.desc": "All products with full PLR/MRR resale rights.",
    "cta.save": "Save 97%",
    "cta.button": "Get All Products",
    "cta.note": "Instant access • Full rights • 30-day guarantee",
    // Footer
    "footer.terms": "Terms",
    "footer.privacy": "Privacy",
    "footer.support": "Support",
    "footer.rights": "All rights reserved.",
  },
  ar: {
    "nav.products": "المنتجات",
    "nav.features": "المميزات",
    "nav.pricing": "الأسعار",
    "nav.getStarted": "ابدأ الآن",
    "hero.badge": "منتج رقمي متوفر",
    "hero.title1": "ابنِ إمبراطوريتك",
    "hero.title2": "الرقمية",
    "hero.desc": "كتب إلكترونية، دورات، قوالب وأدوات ذكاء اصطناعي — مع حقوق إعادة البيع الكاملة. اشترِ مرة، وبع للأبد.",
    "hero.browse": "تصفح المنتجات",
    "hero.learn": "اعرف المزيد",
    "hero.trust1": "تحميل فوري",
    "hero.trust2": "حقوق إعادة بيع كاملة",
    "hero.trust3": "ضمان 30 يوم",
    "hero.statProducts": "منتجات",
    "hero.statRights": "حقوق كاملة",
    "hero.statAccess": "وصول فوري",
    "products.search": "ابحث عن منتجات...",
    "products.all": "الكل",
    "products.loadMore": "تحميل المزيد",
    "products.empty": "لم يتم العثور على منتجات.",
    "features.tag": "لماذا تختارنا",
    "features.title": "كل ما تحتاجه",
    "features.titleHighlight": "للنجاح",
    "features.instantDownload": "تحميل فوري",
    "features.instantDownloadDesc": "احصل على جميع ملفاتك فور الشراء. بدون انتظار.",
    "features.resaleRights": "حقوق إعادة بيع كاملة",
    "features.resaleRightsDesc": "PLR و MRR متضمنة. أعد البيع باسمك واحتفظ بـ 100% من الأرباح.",
    "features.guarantee": "ضمان 30 يوم",
    "features.guaranteeDesc": "غير راضٍ؟ استرداد كامل خلال 30 يومًا بدون أسئلة.",
    "features.updates": "تحديثات مدى الحياة",
    "features.updatesDesc": "منتجات جديدة تُضاف بانتظام. اشترِ مرة واحصل على التحديثات للأبد.",
    "cta.tag": "عرض الحزمة",
    "cta.title": "احصل على",
    "cta.titleHighlight": "كل شيء",
    "cta.desc": "جميع المنتجات مع حقوق إعادة البيع الكاملة PLR/MRR.",
    "cta.save": "وفّر 97%",
    "cta.button": "احصل على جميع المنتجات",
    "cta.note": "وصول فوري • حقوق كاملة • ضمان 30 يوم",
    "footer.terms": "الشروط",
    "footer.privacy": "الخصوصية",
    "footer.support": "الدعم",
    "footer.rights": "جميع الحقوق محفوظة.",
  },
  fr: {
    "nav.products": "Produits",
    "nav.features": "Fonctionnalités",
    "nav.pricing": "Tarifs",
    "nav.getStarted": "Commencer",
    "hero.badge": "Produits numériques disponibles",
    "hero.title1": "Construisez votre",
    "hero.title2": "empire numérique",
    "hero.desc": "eBooks, cours, modèles et outils IA premium — avec droits de revente complets. Achetez une fois, vendez pour toujours.",
    "hero.browse": "Parcourir les produits",
    "hero.learn": "En savoir plus",
    "hero.trust1": "Téléchargement instantané",
    "hero.trust2": "Droits PLR/MRR complets",
    "hero.trust3": "Garantie 30 jours",
    "hero.statProducts": "Produits",
    "hero.statRights": "Droits complets",
    "hero.statAccess": "Accès instantané",
    "products.search": "Rechercher des produits...",
    "products.all": "Tous",
    "products.loadMore": "Charger plus",
    "products.empty": "Aucun produit trouvé.",
    "features.tag": "Pourquoi nous choisir",
    "features.title": "Tout ce qu'il vous faut pour",
    "features.titleHighlight": "réussir",
    "features.instantDownload": "Téléchargement instantané",
    "features.instantDownloadDesc": "Recevez tous vos fichiers immédiatement après l'achat.",
    "features.resaleRights": "Droits de revente complets",
    "features.resaleRightsDesc": "PLR et MRR inclus. Revendez sous votre nom, gardez 100% des profits.",
    "features.guarantee": "Garantie 30 jours",
    "features.guaranteeDesc": "Pas satisfait ? Remboursement complet sous 30 jours, sans questions.",
    "features.updates": "Mises à jour à vie",
    "features.updatesDesc": "Nouveaux produits ajoutés régulièrement. Achetez une fois, recevez les mises à jour pour toujours.",
    "cta.tag": "Offre groupée",
    "cta.title": "Obtenez",
    "cta.titleHighlight": "tout",
    "cta.desc": "Tous les produits avec droits de revente PLR/MRR complets.",
    "cta.save": "Économisez 97%",
    "cta.button": "Obtenir tous les produits",
    "cta.note": "Accès instantané • Droits complets • Garantie 30 jours",
    "footer.terms": "Conditions",
    "footer.privacy": "Confidentialité",
    "footer.support": "Support",
    "footer.rights": "Tous droits réservés.",
  },
  es: {
    "nav.products": "Productos",
    "nav.features": "Características",
    "nav.pricing": "Precios",
    "nav.getStarted": "Empezar",
    "hero.badge": "Productos digitales disponibles",
    "hero.title1": "Construye tu",
    "hero.title2": "imperio digital",
    "hero.desc": "eBooks, cursos, plantillas y herramientas de IA premium — con derechos completos de reventa. Compra una vez, vende para siempre.",
    "hero.browse": "Ver productos",
    "hero.learn": "Saber más",
    "hero.trust1": "Descarga instantánea",
    "hero.trust2": "Derechos PLR/MRR completos",
    "hero.trust3": "Garantía de 30 días",
    "hero.statProducts": "Productos",
    "hero.statRights": "Derechos completos",
    "hero.statAccess": "Acceso instantáneo",
    "products.search": "Buscar productos...",
    "products.all": "Todos",
    "products.loadMore": "Cargar más",
    "products.empty": "No se encontraron productos.",
    "features.tag": "¿Por qué elegirnos?",
    "features.title": "Todo lo que necesitas para",
    "features.titleHighlight": "triunfar",
    "features.instantDownload": "Descarga instantánea",
    "features.instantDownloadDesc": "Recibe todos tus archivos inmediatamente después de la compra.",
    "features.resaleRights": "Derechos de reventa completos",
    "features.resaleRightsDesc": "PLR y MRR incluidos. Revende como propio y quédate con el 100% de las ganancias.",
    "features.guarantee": "Garantía de 30 días",
    "features.guaranteeDesc": "¿No estás satisfecho? Reembolso completo en 30 días, sin preguntas.",
    "features.updates": "Actualizaciones de por vida",
    "features.updatesDesc": "Nuevos productos añadidos regularmente. Compra una vez, recibe actualizaciones para siempre.",
    "cta.tag": "Oferta de paquete",
    "cta.title": "Obtén",
    "cta.titleHighlight": "todo",
    "cta.desc": "Todos los productos con derechos de reventa PLR/MRR completos.",
    "cta.save": "Ahorra 97%",
    "cta.button": "Obtener todos los productos",
    "cta.note": "Acceso instantáneo • Derechos completos • Garantía 30 días",
    "footer.terms": "Términos",
    "footer.privacy": "Privacidad",
    "footer.support": "Soporte",
    "footer.rights": "Todos los derechos reservados.",
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("locale") as Locale;
    return saved && translations[saved] ? saved : "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.documentElement.dir = locales.find((loc) => loc.code === l)?.dir || "ltr";
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string) => translations[locale]?.[key] || translations.en[key] || key,
    [locale]
  );

  const dir = locales.find((loc) => loc.code === locale)?.dir || "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
