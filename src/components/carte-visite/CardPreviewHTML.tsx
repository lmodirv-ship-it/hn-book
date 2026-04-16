import { useRef, forwardRef, useImperativeHandle } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CardPreviewHTMLProps {
  backgroundUrl: string;
  logoUrl?: string;
  userData: Record<string, string>;
}

export interface CardPreviewHandle {
  exportPDF: () => Promise<void>;
}

const CardPreviewHTML = forwardRef<CardPreviewHandle, CardPreviewHTMLProps>(
  ({ backgroundUrl, logoUrl, userData }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      exportPDF: async () => {
        if (!cardRef.current) return;
        const canvas = await html2canvas(cardRef.current, {
          scale: 3,
          useCORS: true,
          backgroundColor: null,
        });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 50] });
        pdf.addImage(imgData, "PNG", 0, 0, 90, 50);
        pdf.save(`carte-visite-${userData.name || "card"}.pdf`);
      },
    }));

    return (
      <div
        ref={cardRef}
        className="relative w-full overflow-hidden rounded-xl"
        style={{
          aspectRatio: "9/5",
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-transparent" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-5 md:p-7">
          {/* Top: Logo + Company */}
          <div className="flex items-start justify-between">
            <div>
              {userData.company && (
                <p className="text-white/90 text-[11px] md:text-xs font-medium tracking-wide uppercase">
                  {userData.company}
                </p>
              )}
            </div>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-10 h-10 md:w-12 md:h-12 object-contain rounded bg-white/10 p-1"
                crossOrigin="anonymous"
              />
            )}
          </div>

          {/* Bottom: User info */}
          <div className="space-y-0.5">
            {userData.name && (
              <h3 className="text-white text-lg md:text-xl font-bold leading-tight">
                {userData.name}
              </h3>
            )}
            {userData.job_title && (
              <p className="text-white/80 text-xs md:text-sm">{userData.job_title}</p>
            )}
            <div className="pt-2 space-y-0.5">
              {userData.phone && (
                <p className="text-white/70 text-[10px] md:text-xs">📞 {userData.phone}</p>
              )}
              {userData.email && (
                <p className="text-white/70 text-[10px] md:text-xs">✉️ {userData.email}</p>
              )}
              {userData.address && (
                <p className="text-white/70 text-[10px] md:text-xs">📍 {userData.address}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CardPreviewHTML.displayName = "CardPreviewHTML";

export default CardPreviewHTML;
