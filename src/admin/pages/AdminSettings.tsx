import { motion } from "framer-motion";
import { Settings, Globe, Palette, Bell, Shield, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AdminSettings = () => (
  <div className="space-y-6 max-w-2xl" dir="rtl">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl font-extrabold text-foreground">⚙️ الإعدادات</h1>
      <p className="text-sm text-muted-foreground mt-0.5">إعدادات المتجر العامة</p>
    </motion.div>

    {[
      {
        icon: Store, title: "معلومات المتجر",
        fields: [
          { label: "اسم المتجر", value: "HN Book", placeholder: "اسم المتجر" },
          { label: "البريد الإلكتروني", value: "contact@hnbook.com", placeholder: "بريد التواصل" },
          { label: "رقم الهاتف", value: "+212 600 000 000", placeholder: "رقم الهاتف" },
        ]
      },
      {
        icon: Globe, title: "اللغة والمنطقة",
        fields: [
          { label: "اللغة الافتراضية", value: "العربية", placeholder: "اللغة" },
          { label: "العملة", value: "USD", placeholder: "العملة" },
        ]
      },
    ].map((section, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <section.icon className="w-4 h-4 text-primary" />
          {section.title}
        </h3>
        <div className="space-y-4">
          {section.fields.map((field) => (
            <div key={field.label}>
              <label className="text-xs text-muted-foreground mb-1.5 block">{field.label}</label>
              <Input defaultValue={field.value} placeholder={field.placeholder} className="bg-secondary/30 border-border" />
            </div>
          ))}
        </div>
      </motion.div>
    ))}

    <Button className="w-full">حفظ الإعدادات</Button>
  </div>
);

export default AdminSettings;
