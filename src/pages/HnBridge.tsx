import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useHnIdentity } from "@/hooks/useHnIdentity";

/**
 * Universal Bridge: single sign-in entry point.
 * Resolves the user's role for this app and routes them to the right dashboard.
 */
const HnBridge = () => {
  const navigate = useNavigate();
  const { loading, redirect } = useHnIdentity();

  useEffect(() => {
    if (!loading) navigate(redirect, { replace: true });
  }, [loading, redirect, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background" dir="rtl">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">جارٍ التحقق من الصلاحيات وتوجيهك…</p>
    </div>
  );
};

export default HnBridge;
