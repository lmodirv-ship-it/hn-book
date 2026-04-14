import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, count, autoImport, books: preSelectedBooks } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "يرجى إدخال كلمة البحث" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bookCount = Math.min(Math.max(count || 5, 1), 20);
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Step 1a: Search Google Books API directly (real results)
    const googleBooksResults: any[] = [];
    try {
      const GOOGLE_BOOKS_API_KEY = Deno.env.get("GOOGLE_BOOKS_API_KEY") || "";
      console.log("Google Books API key present:", !!GOOGLE_BOOKS_API_KEY, "length:", GOOGLE_BOOKS_API_KEY.length);
      const gbKeyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : "";
      let gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${Math.min(bookCount, 40)}&orderBy=relevance${gbKeyParam}`;
      console.log("Google Books: searching...");
      let gbResp = await fetch(gbUrl);
      // If API key is blocked (403), retry without key
      if (!gbResp.ok && GOOGLE_BOOKS_API_KEY) {
        console.log("Google Books: API key blocked, retrying without key...");
        gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${Math.min(bookCount, 40)}&orderBy=relevance`;
        gbResp = await fetch(gbUrl);
      }
      console.log("Google Books status:", gbResp.status);
      console.log("Google Books status:", gbResp.status);
      if (gbResp.ok) {
        const gbData = await gbResp.json();
        console.log("Google Books totalItems:", gbData.totalItems, "items:", (gbData.items || []).length);
        for (const item of (gbData.items || [])) {
          const v = item.volumeInfo || {};
          const accessInfo = item.accessInfo || {};
          const pdfInfo = accessInfo.pdf || {};
          const epubInfo = accessInfo.epub || {};

          let downloadUrl = pdfInfo.downloadLink || pdfInfo.acsTokenLink || "";
          const previewLink = v.previewLink || "";
          const infoLink = v.infoLink || "";

          const thumbnail = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || "";
          const coverUrl = thumbnail ? thumbnail.replace("http://", "https://").replace("&edge=curl", "") : "";

          const identifiers = v.industryIdentifiers || [];
          const isbn = identifiers.find((id: any) => id.type === "ISBN_13")?.identifier ||
                       identifiers.find((id: any) => id.type === "ISBN_10")?.identifier || "";

          googleBooksResults.push({
            title: v.title || "Unknown",
            author: (v.authors || []).join(", ") || "Unknown",
            description: v.description?.substring(0, 200) || `${v.title} by ${(v.authors || []).join(", ")}`,
            category: (v.categories || ["كتب"])[0],
            language: v.language || "en",
            year: v.publishedDate ? parseInt(v.publishedDate) : null,
            pages: v.pageCount || null,
            source: "Google Books",
            source_url: infoLink || previewLink,
            download_url: downloadUrl || previewLink,
            cover_url: coverUrl,
            isbn: isbn,
            _google_id: item.id,
            _accessViewStatus: accessInfo.viewability,
            _has_pdf: pdfInfo.isAvailable || false,
            _has_epub: epubInfo.isAvailable || false,
          });
        }
        console.log(`Google Books: found ${googleBooksResults.length} free ebooks`);
      } else {
        const errText = await gbResp.text();
        console.error("Google Books API failed:", gbResp.status, errText);
      }
    } catch (gbErr) {
      console.error("Google Books API error:", gbErr);
    }

    // Step 1b: Use Gemini to search for more free books from other platforms
    const remainingCount = Math.max(bookCount - googleBooksResults.length, 2);
    const searchPrompt = `Search for ${remainingCount} free downloadable resources about "${query}" available on the internet.
Look on these platforms and any other relevant open sources:
- Internet Archive (archive.org)
- OpenLibrary (openlibrary.org)
- Project Gutenberg (gutenberg.org)
- Freepik, Canva free templates
- Wikimedia Commons
- Unsplash, Pexels (for images/designs)
- Any other legitimate free resource platforms

The search query is: "${query}"
This could be books, templates (carte visite, logos, flyers), magazines, paintings, designs, images, or any digital content.

Do NOT include Google Books results. Only include resources from other platforms.
For each resource provide REAL, VERIFIED information. Only include items that are actually freely available.

Return the result as a JSON object with a "books" array. Each item object must have:
- title (string)
- author (string, or creator/designer name)
- description (string, in Arabic)
- category (string, e.g. "كتب", "قوالب", "تصاميم", "لوحات", "مجلات", "شعارات")
- language (string, e.g. "en", "ar", "fr")
- year (number or null)
- pages (number or null)
- source (string, platform name)
- source_url (string, URL to resource page)
- download_url (string, direct download URL)
- cover_url (string, preview/thumbnail image URL)
- isbn (string, if available, empty string if not)

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        systemInstruction: {
          parts: [{ text: "You are a digital content expert. You find real, freely available resources from open-source platforms - including books, design templates, logos, business cards, magazines, paintings, and any digital content. Only return items that genuinely exist and are freely downloadable. Never invent fake URLs. Always respond with valid JSON only." }],
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      if (response.status === 429) {
        // If Gemini fails but we have Google Books results, return those
        if (googleBooksResults.length > 0) {
          const books = googleBooksResults;
          // Continue to verification step below
          const verifiedBooks: any[] = [];
          for (const book of books) {
            if (book._has_pdf || book._has_epub) {
              book._verified = true;
            } else {
              try {
                const headResp = await fetch(book.download_url, { method: "HEAD", redirect: "follow" });
                book._verified = headResp.ok;
                book._content_type = headResp.headers.get("content-type") || "";
                book._file_size = parseInt(headResp.headers.get("content-length") || "0");
              } catch { book._verified = false; }
            }
            verifiedBooks.push(book);
          }
          return new Response(JSON.stringify({
            success: true, query, total: verifiedBooks.length,
            verified: verifiedBooks.filter((b: any) => b._verified).length,
            books: verifiedBooks,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "معدل الطلبات مرتفع، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (googleBooksResults.length === 0) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
    }

    let geminiBooks: any[] = [];
    if (response.ok) {
      const aiData = await response.json();
      const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textContent) {
        try {
          let parsed;
          try { parsed = JSON.parse(textContent); } catch {
            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          }
          if (parsed) geminiBooks = parsed.books || parsed;
        } catch { console.error("Failed to parse Gemini response"); }
      }
    }

    // Merge: Google Books first, then Gemini results
    const books = [...googleBooksResults, ...geminiBooks].slice(0, bookCount);

    // Step 2: Verify URLs are accessible
    const verifiedBooks = [];
    for (const book of books) {
      // Google Books with PDF/epub available are pre-verified
      if (book._has_pdf || book._has_epub) {
        book._verified = true;
        verifiedBooks.push(book);
        continue;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const headResp = await fetch(book.download_url, { method: "HEAD", redirect: "follow", signal: controller.signal });
        clearTimeout(timeoutId);
        book._verified = headResp.ok;
        book._content_type = headResp.headers.get("content-type") || "";
        book._file_size = parseInt(headResp.headers.get("content-length") || "0");
      } catch {
        book._verified = false;
      }
      verifiedBooks.push(book);
    }

    // Step 3: If autoImport, download and save to database
    if (autoImport) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Category → storage folder mapping
      const categoryFolder = (cat: string): string => {
        const c = (cat || "").toLowerCase();
        if (c.includes("شعار") || c.includes("logo")) return "logos";
        if (c.includes("قالب") || c.includes("carte") || c.includes("بطاق")) return "templates";
        if (c.includes("مجل") || c.includes("magazine")) return "magazines";
        if (c.includes("لوح") || c.includes("paint") || c.includes("art")) return "paintings";
        if (c.includes("تصم") || c.includes("design") || c.includes("flyer")) return "designs";
        return "books";
      };

      const imported = [];
      for (const book of verifiedBooks) {
        if (!book._verified) {
          imported.push({ ...book, _imported: false, _reason: "رابط غير متاح" });
          continue;
        }

        const folder = categoryFolder(book.category);

        try {
          // Step A: Insert product first to get the auto-generated reference_code
          const { data: product, error: insertErr } = await supabase.from("products").insert({
            name: book.title,
            short_description: book.description || `${book.title} - ${book.author}`,
            description: `📖 ${book.description || book.title}\n\n👤 المؤلف/المصمم: ${book.author}\n🌐 المصدر: ${book.source}\n🗣️ اللغة: ${book.language || "en"}\n📅 السنة: ${book.year || "غير محدد"}\n📂 النوع: ${book.category || folder}\n\n🔗 ${book.source_url}`,
            category: book.category || "كتب",
            price: 0,
            is_active: true,
            features: [
              `👤 ${book.author}`,
              `🌐 ${book.source}`,
              book.language ? `🗣️ ${book.language}` : "",
              book.pages ? `📄 ${book.pages} صفحة` : "",
              `📥 مجاني ومفتوح المصدر`,
            ].filter(Boolean),
          }).select().single();

          if (insertErr || !product) {
            imported.push({ ...book, _imported: false, _reason: insertErr?.message || "فشل الإدراج" });
            continue;
          }

          const ref = product.reference_code || product.id.substring(0, 8);

          // Step B: Download & upload main file using reference_code as folder + filename
          let fileUrl: string | null = null;
          let storagePath: string | null = null;
          let fileExt = "pdf";
          let fileType = "pdf";

          try {
            const dlResp = await fetch(book.download_url);
            if (dlResp.ok) {
              const ct = dlResp.headers.get("content-type") || "";
              if (ct.includes("image")) {
                fileExt = ct.includes("png") ? "png" : "jpg";
                fileType = "image";
              } else if (ct.includes("svg")) {
                fileExt = "svg";
                fileType = "image";
              }

              const fileData = await dlResp.arrayBuffer();
              const bucket = fileType === "pdf" ? "book-files" : "book-images";
              const path = `${folder}/${ref}/${ref}.${fileExt}`;

              const { error: upErr } = await supabase.storage
                .from(bucket)
                .upload(path, new Uint8Array(fileData), { contentType: ct || "application/pdf", upsert: true });
              if (!upErr) {
                storagePath = `${bucket}/${path}`;
                fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
              }
            }
          } catch (dlErr) {
            console.error(`Download failed for ${book.title}:`, dlErr);
          }

          // Step C: Download & upload cover image using same reference_code folder
          let coverUrl = book.cover_url || null;
          if (coverUrl) {
            try {
              const coverResp = await fetch(coverUrl);
              if (coverResp.ok) {
                const coverData = await coverResp.arrayBuffer();
                const coverPath = `${folder}/${ref}/${ref}-cover.jpg`;
                const { error: coverErr } = await supabase.storage
                  .from("book-images")
                  .upload(coverPath, new Uint8Array(coverData), { contentType: "image/jpeg", upsert: true });
                if (!coverErr) {
                  coverUrl = `${supabaseUrl}/storage/v1/object/public/book-images/${coverPath}`;
                }
              }
            } catch { /* use original cover URL */ }
          }

          // Step D: Update product with file URLs
          await supabase.from("products").update({
            image: coverUrl,
            pdf_url: fileUrl,
            badge: ref,
          }).eq("id", product.id);

          // Step E: Register file in product_files table
          if (fileUrl && storagePath) {
            await supabase.from("product_files").insert({
              product_id: product.id,
              file_type: fileType as any,
              file_name: `${ref}.${fileExt}`,
              storage_path: storagePath,
              public_url: fileUrl,
              is_primary: true,
            });
          }

          // Register cover in product_files too
          if (coverUrl && coverUrl.includes(supabaseUrl)) {
            await supabase.from("product_files").insert({
              product_id: product.id,
              file_type: "image" as any,
              file_name: `${ref}-cover.jpg`,
              storage_path: `book-images/${folder}/${ref}/${ref}-cover.jpg`,
              public_url: coverUrl,
              is_primary: false,
            });
          }

          imported.push({ ...book, _imported: true, _product_id: product.id, _code: ref });
        } catch (err: any) {
          imported.push({ ...book, _imported: false, _reason: err.message });
        }
      }

      return new Response(JSON.stringify({
        success: true, query, total: books.length,
        verified: verifiedBooks.filter((b: any) => b._verified).length,
        imported: imported.filter((b: any) => b._imported).length,
        books: imported,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true, query, total: books.length,
      verified: verifiedBooks.filter((b: any) => b._verified).length,
      books: verifiedBooks,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("search-books-web error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
