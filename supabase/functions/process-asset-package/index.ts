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
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return { kind: "video", isPreview: false };
  if (["zip", "rar", "7z"].includes(ext)) return { kind: "archive", isPreview: false };
  return { kind: "other", isPreview: false };
}

// Classify folder/file name into asset_type
function classifyFolderName(name: string): string {
  const n = name.toLowerCase();
  if (/(business[-_ ]?card|carte|visiting)/.test(n)) return "CRD";
  if (/(flyer|leaflet|flayer)/.test(n)) return "FLY";
  if (/(poster|affiche)/.test(n)) return "PST";
  if (/(logo|brand|mark)/.test(n)) return "LOG";
  if (/(t[-_ ]?shirt|tshirt|apparel)/.test(n)) return "TSH";
  if (/(resume|cv|curriculum)/.test(n)) return "RES";
  if (/(shopify|theme|website|landing)/.test(n)) return "THM";
  if (/(icon|vector[-_ ]?icon)/.test(n)) return "ICN";
  if (/(font|typeface|typography)/.test(n)) return "FNT";
  if (/(lightroom|preset|lut)/.test(n)) return "PRE";
  if (/(premiere|video|effect|after[-_ ]?effect|motion)/.test(n)) return "VFX";
  if (/(stock|royalty|photo|picture)/.test(n)) return "IMG";
  if (/(canva|social|instagram|facebook|story)/.test(n)) return "TPL";
  if (/(planner|journal|tracker|notebook)/.test(n)) return "TPL";
  if (/(stationery|wedding|invitation)/.test(n)) return "TPL";
  if (/(template|design)/.test(n)) return "TPL";
  return "TPL";
}

function categoryFor(type: string): string {
  if (["CRD", "TPL", "LOG", "FLY", "PST", "TSH", "RES", "THM", "ICN"].includes(type)) return "DSN";
  if (["IMG", "ART", "VFX", "PRE"].includes(type)) return "MED";
  if (["FNT"].includes(type)) return "FNT";
  if (["DOC", "LST"].includes(type)) return "DOC";
  return "OTH";
}

function cleanTitle(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\d{4}-\d{2}-\d{2}/g, "")
    .replace(/\b(elements|template|design)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Build a tree: for each top-level folder in the zip, its immediate sub-items
type FileEntry = { path: string; data: Uint8Array };

// Slugify a category code/name for storage paths
function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "uncategorized";
}

async function processSingleAsset(
  supabase: any,
  rootName: string,
  files: FileEntry[],
  detectedType: string,
  titleOverride?: string
) {
  const title = titleOverride || cleanTitle(rootName) || "Untitled";
  const cat = categoryFor(detectedType);

  const { data: asset, error: assetErr } = await supabase
    .from("assets")
    .insert({
      asset_type: detectedType,
      category: cat,
      title,
      image_url: "/placeholder.svg",
      is_active: true,
      metadata: { source_folder: rootName },
    })
    .select()
    .single();
  if (assetErr) throw assetErr;

  const assetCode = asset.code || asset.id;
  // New layout: {asset_type}/{category_slug}/{asset_code}/{file}
  const categorySlug = slugify(cat);
  const baseStoragePath = `${detectedType}/${categorySlug}/${assetCode}`;

  // Find primary preview (first JPG/PNG at root of this asset)
  let primaryPreviewIdx = -1;
  for (let i = 0; i < files.length; i++) {
    const rel = files[i].path;
    if (!rel.includes("/")) {
      const ext = rel.toLowerCase().split(".").pop();
      if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
        primaryPreviewIdx = i;
        break;
      }
    }
  }
  // fallback: any image
  if (primaryPreviewIdx === -1) {
    for (let i = 0; i < files.length; i++) {
      const ext = files[i].path.toLowerCase().split(".").pop();
      if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
        primaryPreviewIdx = i;
        break;
      }
    }
  }

  let previewUrl = "/placeholder.svg";
  const uploadedFiles: any[] = [];

  for (let i = 0; i < files.length; i++) {
    const { path: relPath, data } = files[i];
    const fileName = relPath.split("/").pop()!;
    const folderPath = relPath.includes("/") ? relPath.slice(0, relPath.lastIndexOf("/")) : "";
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    const { kind } = classifyFile(fileName, folderPath);

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

  if (previewUrl !== "/placeholder.svg") {
    await supabase.from("assets").update({ image_url: previewUrl }).eq("id", asset.id);
  }

  return { asset: { ...asset, image_url: previewUrl }, files_count: uploadedFiles.length };
}

// Detect if root contains category folders (mega-zip)
function isMegaZip(topLevelFolders: string[]): boolean {
  if (topLevelFolders.length < 2) return false;
  // Heuristic: at least 2 distinct category-ish names
  const recognised = topLevelFolders.filter((f) => {
    const n = f.toLowerCase();
    return /(canva|lightroom|premiere|resume|shopify|t[-_ ]?shirt|video|font|icon|stock|royalty|theme|preset|effect|template|planner|design|business|flyer|poster|logo)/.test(n);
  });
  return recognised.length >= 2;
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
    const modeInput = (formData.get("mode") as string | null) || "auto"; // auto | single | mega

    if (!file) throw new Error("لم يتم استلام ملف ZIP");

    const arrayBuf = await file.arrayBuffer();
    const entries = await unzip(new Uint8Array(arrayBuf));

    const allEntries = Object.entries(entries).filter(([name, data]) => {
      if (name.startsWith("__MACOSX/") || name.includes("/.DS_Store")) return false;
      if (name.endsWith("/")) return false;
      return data && (data as Uint8Array).byteLength > 0;
    }) as [string, Uint8Array][];

    if (allEntries.length === 0) throw new Error("الأرشيف فارغ");

    // Group by top-level folder
    const groups = new Map<string, FileEntry[]>();
    for (const [fullPath, data] of allEntries) {
      const parts = fullPath.split("/");
      const top = parts[0];
      const rest = parts.slice(1).join("/") || parts[0];
      if (!groups.has(top)) groups.set(top, []);
      groups.get(top)!.push({ path: rest, data });
    }

    const topFolders = [...groups.keys()];
    const mega =
      modeInput === "mega" ||
      (modeInput === "auto" && topFolders.length > 1 && isMegaZip(topFolders));

    // ==================== MEGA ZIP MODE ====================
    if (mega) {
      const created: any[] = [];
      const errors: string[] = [];

      for (const [categoryName, catFiles] of groups) {
        // Detect inner asset folders inside this category
        const innerGroups = new Map<string, FileEntry[]>();
        const looseFiles: FileEntry[] = [];
        for (const f of catFiles) {
          if (f.path.includes("/")) {
            const inner = f.path.split("/")[0];
            const innerRest = f.path.split("/").slice(1).join("/");
            if (!innerGroups.has(inner)) innerGroups.set(inner, []);
            innerGroups.get(inner)!.push({ path: innerRest, data: f.data });
          } else {
            looseFiles.push(f);
          }
        }

        const detectedType = classifyFolderName(categoryName);

        // If the category has subfolders → each subfolder = one asset
        if (innerGroups.size > 0) {
          for (const [innerName, innerFiles] of innerGroups) {
            try {
              const innerType = classifyFolderName(innerName) !== "TPL"
                ? classifyFolderName(innerName)
                : detectedType;
              const result = await processSingleAsset(
                supabase,
                innerName,
                innerFiles,
                innerType,
                cleanTitle(innerName)
              );
              created.push(result.asset);
            } catch (e) {
              console.error("inner asset failed", innerName, e);
              errors.push(`${innerName}: ${String(e?.message || e)}`);
            }
          }
        }

        // Loose files at category root → one asset for all of them
        if (looseFiles.length > 0) {
          try {
            const result = await processSingleAsset(
              supabase,
              categoryName,
              looseFiles,
              detectedType,
              cleanTitle(categoryName)
            );
            created.push(result.asset);
          } catch (e) {
            console.error("category-root asset failed", categoryName, e);
            errors.push(`${categoryName}: ${String(e?.message || e)}`);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "mega",
          assets_created: created.length,
          assets: created,
          errors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== SINGLE ASSET MODE ====================
    const rootName =
      topFolders.length === 1 ? topFolders[0] : file.name.replace(/\.zip$/i, "");
    const filesForAsset =
      topFolders.length === 1
        ? groups.get(rootName)!
        : allEntries.map(([p, d]) => ({ path: p, data: d }));

    const detectedType = assetTypeInput || classifyFolderName(rootName);
    const result = await processSingleAsset(
      supabase,
      rootName,
      filesForAsset,
      detectedType,
      titleInput || cleanTitle(rootName)
    );

    return new Response(
      JSON.stringify({
        success: true,
        mode: "single",
        asset: result.asset,
        files_count: result.files_count,
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
