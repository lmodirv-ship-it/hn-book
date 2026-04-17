// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { unzip } from "https://deno.land/x/zipjs@v2.7.45/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map extensions to file_kind
function classifyFile(name: string, folderPath: string): { kind: string; isPreview: boolean } {
  const lower = name.toLowerCase();
  const folder = folderPath.toLowerCase();
  const ext = lower.split(".").pop() || "";

  if (lower.includes("license") || lower.includes("licence")) return { kind: "license", isPreview: false };
  if (folder.includes("font") || ["ttf", "otf", "woff", "woff2"].includes(ext)) return { kind: "font", isPreview: false };
  if (["ai", "eps", "psd", "indd", "sketch", "fig", "xd"].includes(ext)) return { kind: "source", isPreview: false };
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return { kind: "preview", isPreview: true };
  if (["pdf"].includes(ext)) return { kind: "document", isPreview: false };
  if (["svg"].includes(ext)) return { kind: "source", isPreview: false };
  return { kind: "other", isPreview: false };
}

// Suggest asset_type from folder/file names
function suggestAssetType(rootName: string): string {
  const n = rootName.toLowerCase();
  if (n.includes("business-card") || n.includes("business_card") || n.includes("card")) return "CRD";
  if (n.includes("flyer") || n.includes("fly")) return "FLY";
  if (n.includes("poster")) return "PST";
  if (n.includes("logo")) return "LOG";
  if (n.includes("stationery") || n.includes("template")) return "TPL";
  return "TPL";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const titleInput = (formData.get("title") as string | null) || "";
    const assetTypeInput = (formData.get("asset_type") as string | null) || "";

    if (!file) throw new Error("لم يتم استلام ملف ZIP");

    const arrayBuf = await file.arrayBuffer();
    const entries = await unzip(new Uint8Array(arrayBuf));

    const fileEntries = Object.entries(entries).filter(([name, data]) => {
      // skip __MACOSX and folders
      if (name.startsWith("__MACOSX/") || name.includes("/.DS_Store")) return false;
      if (name.endsWith("/")) return false;
      return data && (data as Uint8Array).byteLength > 0;
    });

    if (fileEntries.length === 0) throw new Error("الأرشيف فارغ");

    // Determine root folder (first segment)
    const rootName = (fileEntries[0][0].split("/")[0] || file.name.replace(/\.zip$/i, ""));
    const detectedType = assetTypeInput || suggestAssetType(rootName);
    const title = titleInput || rootName.replace(/[-_]/g, " ").replace(/\d{4}-\d{2}-\d{2}/, "").trim();

    // Find primary preview (first JPG/PNG in root)
    let previewUrl = "/placeholder.svg";
    let primaryPreviewIdx = -1;
    for (let i = 0; i < fileEntries.length; i++) {
      const [name] = fileEntries[i];
      const cleaned = name.replace(`${rootName}/`, "");
      if (!cleaned.includes("/")) {
        const ext = cleaned.toLowerCase().split(".").pop();
        if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
          primaryPreviewIdx = i;
          break;
        }
      }
    }

    // Create asset (code auto-generated)
    const { data: asset, error: assetErr } = await supabase
      .from("assets")
      .insert({
        asset_type: detectedType,
        category: ["CRD", "TPL", "LOG", "FLY", "PST"].includes(detectedType) ? "DSN" : "OTH",
        title: title || "Untitled",
        image_url: "/placeholder.svg",
        is_active: true,
      })
      .select()
      .single();
    if (assetErr) throw assetErr;

    const assetCode = asset.code || asset.id;
    const baseStoragePath = `${detectedType}/${assetCode}`;

    // Upload all files
    const uploadedFiles = [];
    for (let i = 0; i < fileEntries.length; i++) {
      const [fullPath, data] = fileEntries[i] as [string, Uint8Array];
      const relPath = fullPath.startsWith(`${rootName}/`) ? fullPath.slice(rootName.length + 1) : fullPath;
      const fileName = relPath.split("/").pop()!;
      const folderPath = relPath.includes("/") ? relPath.slice(0, relPath.lastIndexOf("/")) : "";
      const ext = (fileName.split(".").pop() || "").toLowerCase();
      const { kind, isPreview } = classifyFile(fileName, folderPath);

      const storagePath = `${baseStoragePath}/${relPath}`;
      const { error: upErr } = await supabase.storage
        .from("asset-packages")
        .upload(storagePath, data, { upsert: true, contentType: undefined });
      if (upErr) {
        console.error("upload error", storagePath, upErr);
        continue;
      }
      const { data: pub } = supabase.storage.from("asset-packages").getPublicUrl(storagePath);

      uploadedFiles.push({
        asset_id: asset.id,
        file_kind: kind,
        file_name: fileName,
        file_extension: ext,
        storage_path: storagePath,
        public_url: pub.publicUrl,
        file_size: data.byteLength,
        folder_path: folderPath,
        is_primary: i === primaryPreviewIdx,
        sort_order: i,
      });

      if (i === primaryPreviewIdx) previewUrl = pub.publicUrl;
    }

    if (uploadedFiles.length > 0) {
      const { error: filesErr } = await supabase.from("asset_files").insert(uploadedFiles);
      if (filesErr) console.error("asset_files insert error", filesErr);
    }

    // Update primary preview on asset
    if (previewUrl !== "/placeholder.svg") {
      await supabase.from("assets").update({ image_url: previewUrl }).eq("id", asset.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        asset: { ...asset, image_url: previewUrl },
        files_count: uploadedFiles.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-asset-package error", e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
