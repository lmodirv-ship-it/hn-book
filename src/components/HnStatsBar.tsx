import { useEffect, useState } from "react";
import { Users, Eye, Clock, UserCheck } from "lucide-react";
import { useHnStats } from "@/hooks/useHnStats";

const fmt = (n: number) => new Intl.NumberFormat("ar-MA").format(n);

/** Live visitors + members + clock strip */
const HnStatsBar = () => {
  const { stats } = useHnStats();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const items = [
    { icon: Eye, label: "زوار اليوم", value: fmt(stats?.visitors_today ?? 0), chip: "icon-chip-cyan" },
    { icon: Users, label: "إجمالي الزوار", value: fmt(stats?.visitors_total ?? 0), chip: "icon-chip-blue" },
    { icon: UserCheck, label: "المنخرطون", value: fmt(stats?.members_total ?? 0), chip: "icon-chip-green" },
    {
      icon: Clock,
      label: now.toLocaleDateString("ar-MA"),
      value: now.toLocaleTimeString("ar-MA", { hour12: false }),
      chip: "icon-chip-gold",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" dir="rtl">
      {items.map((it) => (
        <div key={it.label} className="glass-future rounded-xl p-3 flex items-center gap-3">
          <div className={`${it.chip} shrink-0`}>
            <it.icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground tabular-nums truncate">{it.value}</div>
            <div className="text-[11px] text-muted-foreground truncate">{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HnStatsBar;
