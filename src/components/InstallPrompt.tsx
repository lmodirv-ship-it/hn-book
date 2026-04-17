import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "hn-install-dismissed-at";
const DISMISS_DAYS = 14;

/**
 * Floating install prompt for Android/desktop Chrome (uses beforeinstallprompt).
 * iOS Safari has no programmatic install API — users must use Share → Add to
 * Home Screen, so we show a short hint instead.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Skip if already installed or dismissed recently
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS hint (no API): show once after 10s if Safari mobile
    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    let timer: number | undefined;
    if (isIos) {
      timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 10_000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="تثبيت التطبيق"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur shadow-2xl p-4 flex items-start gap-3"
      dir="rtl"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">ثبّت تطبيق HN</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {iosHint
            ? "اضغط على زر المشاركة ثم «أضف إلى الشاشة الرئيسية»."
            : "افتح من شاشتك الرئيسية بدون متصفح، تجربة أسرع وأبسط."}
        </p>
        {!iosHint && deferred && (
          <Button size="sm" onClick={install} className="mt-2 h-8 text-xs gap-1">
            <Download className="w-3.5 h-3.5" /> تثبيت الآن
          </Button>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="إغلاق"
        className="shrink-0 w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
