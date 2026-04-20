import { motion } from "framer-motion";
import {
  BookOpen,
  Paintbrush,
  CreditCard,
  FileText,
  Image,
  Presentation,
  Megaphone,
  LayoutTemplate,
  Layers,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";

interface CategoryConfig {
  label: string;
  icon: ReactNode;
  glow: string; // tailwind ring/shadow color
}

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  كتب: {
    label: "كتب",
    icon: <BookOpen className="h-4 w-4" />,
    glow: "from-emerald-500/20 to-emerald-400/5 shadow-emerald-500/25 border-emerald-500/30",
  },
  Logo: {
    label: "Logo",
    icon: <Paintbrush className="h-4 w-4" />,
    glow: "from-violet-500/20 to-violet-400/5 shadow-violet-500/25 border-violet-500/30",
  },
  "بطاقات": {
    label: "Carte Visite",
    icon: <CreditCard className="h-4 w-4" />,
    glow: "from-sky-500/20 to-sky-400/5 shadow-sky-500/25 border-sky-500/30",
  },
  "قوالب": {
    label: "نماذج",
    icon: <LayoutTemplate className="h-4 w-4" />,
    glow: "from-amber-500/20 to-amber-400/5 shadow-amber-500/25 border-amber-500/30",
  },
  Flyer: {
    label: "Flyer",
    icon: <Megaphone className="h-4 w-4" />,
    glow: "from-rose-500/20 to-rose-400/5 shadow-rose-500/25 border-rose-500/30",
  },
  "صور": {
    label: "صور",
    icon: <Image className="h-4 w-4" />,
    glow: "from-pink-500/20 to-pink-400/5 shadow-pink-500/25 border-pink-500/30",
  },
  "وثائق": {
    label: "وثائق",
    icon: <FileText className="h-4 w-4" />,
    glow: "from-cyan-500/20 to-cyan-400/5 shadow-cyan-500/25 border-cyan-500/30",
  },
  "عروض": {
    label: "عروض",
    icon: <Presentation className="h-4 w-4" />,
    glow: "from-orange-500/20 to-orange-400/5 shadow-orange-500/25 border-orange-500/30",
  },
  "أخرى": {
    label: "أخرى",
    icon: <Layers className="h-4 w-4" />,
    glow: "from-slate-500/20 to-slate-400/5 shadow-slate-500/25 border-slate-500/30",
  },
};

const DEFAULT_CONFIG: CategoryConfig = {
  label: "",
  icon: <Star className="h-4 w-4" />,
  glow: "from-primary/20 to-primary/5 shadow-primary/25 border-primary/30",
};

interface CategoryBarProps {
  categories: string[];
  activeCategory: string;
  onSelect: (cat: string) => void;
  productCounts?: Record<string, number>;
}

const CategoryBar = ({ categories, activeCategory, onSelect, productCounts }: CategoryBarProps) => {
  const allCategories = ["All", ...categories];

  return (
    <div className="w-full overflow-x-auto scrollbar-hide pb-2">
      <div className="flex gap-2 min-w-max px-1">
        {allCategories.map((cat, i) => {
          const isAll = cat === "All";
          const config = isAll
            ? { label: "الكل", icon: <Layers className="h-4 w-4" />, glow: "from-primary/20 to-primary/5 shadow-primary/25 border-primary/30" }
            : CATEGORY_MAP[cat] || { ...DEFAULT_CONFIG, label: cat };
          const isActive = activeCategory === cat;
          const count = isAll ? undefined : productCounts?.[cat];

          return (
            <motion.button
              key={cat}
              onClick={() => onSelect(cat)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className={`
                relative group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                ${isActive
                  ? "glass-future text-foreground shadow-[0_0_24px_-4px_hsl(195_95%_55%/0.55)] border-[hsl(195_95%_60%/0.6)]"
                  : "glass-subtle text-muted-foreground hover:text-foreground hover:border-[hsl(195_95%_60%/0.35)]"
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="categoryGlow"
                  className="absolute inset-0 rounded-xl bg-[hsl(195_95%_55%/0.18)] blur-md opacity-70 -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}

              <span className={`transition-colors duration-200 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                {config.icon}
              </span>
              <span className="whitespace-nowrap">{config.label}</span>
              {count !== undefined && count > 0 && (
                <span className={`
                  text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                  ${isActive ? "bg-foreground/15 text-foreground" : "bg-muted/50 text-muted-foreground"}
                `}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryBar;
