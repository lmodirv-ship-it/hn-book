import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, ShieldAlert } from "lucide-react";

interface Props {
  permission: string;
  children: ReactNode;
}

const RequirePermission = ({ permission, children }: Props) => {
  const { has, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!has(permission)) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8 gap-3">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-semibold">صلاحية غير كافية</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          ليس لديك إذن "{permission}" للوصول إلى هذه الصفحة. تواصل مع المدير لمنحك الصلاحية.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequirePermission;
