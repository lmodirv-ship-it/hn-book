import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, count, autoImport } = await req.json();
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
      const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&filter=free-ebooks&maxResults=${Math.min(bookCount, 10)}&langRestrict=&orderBy=relevance`;
      const gbResp = await fetch(gbUrl);
      if (gbResp.ok) {
        const gbData = await gbResp.json();
        for (const item of (gbData.items || [])) {
          const v = item.volumeInfo || {};
          const accessInfo = item.accessInfo || {};
          const pdfInfo = accessInfo.pdf || {};
          const epubInfo = accessInfo.epub || {};

          // Get the best download/read link
          let downloadUrl = pdfInfo.downloadLink || pdfInfo.acsTokenLink || "";
          const previewLink = v.previewLink || "";
          const infoLink = v.infoLink || "";

          // Build cover URL
          const thumbnail = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || "";
          const coverUrl = thumbnail ? thumbnail.replace("http://", "https://").replace("&edge=curl", "") : "";

          // Get ISBN
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
      }
    } catch (gbErr) {
      console.error("Google Books API error:", gbErr);
    }

    // Step 1b: Use Gemini to search for more free books from other platforms
    const remainingCount = Math.max(bookCount - googleBooksResults.length, 2);
    const searchPrompt = `Search for ${remainingCount} free PDF books about "${query}" available on these open-source platforms:
- Internet Archive (archive.org)
- OpenLibrary (openlibrary.org)
- Project Gutenberg (gutenberg.org)
- Standard Ebooks (standardebooks.org)
- ManyBooks (manybooks.net)

Do NOT include Google Books results. Only include books from the platforms listed above.
For each book provide REAL, VERIFIED information. Only include books that are actually freely available.
For download URLs, use the actual archive.org or gutenberg.org download links.
For cover images, use the Open Library Covers API: https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg or archive.org thumbnails.

Return the result as a JSON object with a "books" array. Each book object must have:
- title (string)
- author (string)
- description (string, in Arabic)
- category (string)
- language (string, e.g. "en", "ar", "fr")
- year (number)
- pages (number)
- source (string, platform name)
- source_url (string, URL to book page)
- download_url (string, direct PDF download URL)
- cover_url (string, cover image URL)
- isbn (string, if available)

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        systemInstruction: {
          parts: [{ text: "You are a librarian expert. You find real, freely available books from open-source platforms. Only return books that genuinely exist and are freely downloadable. Never invent fake URLs. Always respond with valid JSON only." }],
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

      const { count: existingCount } = await supabase.from("products").select("*", { count: "exact", head: true });
      let nextNum = (existingCount || 0) + 1;

      const imported = [];
      for (const book of verifiedBooks) {
        if (!book._verified) {
          imported.push({ ...book, _imported: false, _reason: "رابط غير متاح" });
          continue;
        }

        const bookCode = `HNB-${String(nextNum).padStart(4, "0")}`;

        try {
          let pdfUrl: string | null = null;
          let storagePath: string | null = null;
          try {
            const dlResp = await fetch(book.download_url);
            if (dlResp.ok) {
              const pdfData = await dlResp.arrayBuffer();
              const path = `web-import/${bookCode}/${Date.now()}.pdf`;
              const { error: upErr } = await supabase.storage
                .from("book-files")
                .upload(path, new Uint8Array(pdfData), { contentType: "application/pdf", upsert: true });
              if (!upErr) {
                storagePath = `book-files/${path}`;
                pdfUrl = `${supabaseUrl}/storage/v1/object/public/book-files/${path}`;
              }
            }
          } catch (dlErr) {
            console.error(`Download failed for ${book.title}:`, dlErr);
          }

          let coverUrl = book.cover_url || null;
          if (coverUrl) {
            try {
              const coverResp = await fetch(coverUrl);
              if (coverResp.ok) {
                const coverData = await coverResp.arrayBuffer();
                const coverPath = `web-import/${bookCode}/cover.jpg`;
                const { error: coverErr } = await supabase.storage
                  .from("book-images")
                  .upload(coverPath, new Uint8Array(coverData), { contentType: "image/jpeg", upsert: true });
                if (!coverErr) {
                  coverUrl = `${supabaseUrl}/storage/v1/object/public/book-images/${coverPath}`;
                }
              }
            } catch { /* use original cover URL */ }
          }

          const { data: product, error: insertErr } = await supabase.from("products").insert({
            name: book.title,
            short_description: book.description || `${book.title} - ${book.author}`,
            description: `📖 ${book.description || book.title}\n\nالمؤلف: ${book.author}\nالمصدر: ${book.source}\nاللغة: ${book.language || "en"}\nالسنة: ${book.year || "غير محدد"}\n\n🔗 ${book.source_url}`,
            category: book.category || "كتب",
            price: 0,
            image: coverUrl,
            pdf_url: pdfUrl,
            badge: bookCode,
            is_active: true,
            features: [
              `المؤلف: ${book.author}`,
              `المصدر: ${book.source}`,
              book.language ? `اللغة: ${book.language}` : "",
              book.pages ? `الصفحات: ${book.pages}` : "",
              `📥 مجاني ومفتوح المصدر`,
            ].filter(Boolean),
          }).select().single();

          if (!insertErr && product) {
            if (pdfUrl && storagePath) {
              await supabase.from("product_files").insert({
                product_id: product.id,
                file_type: "pdf" as any,
                file_name: `${bookCode}.pdf`,
                storage_path: storagePath,
                public_url: pdfUrl,
                is_primary: true,
              });
            }
            imported.push({ ...book, _imported: true, _product_id: product.id, _code: bookCode });
            nextNum++;
          } else {
            imported.push({ ...book, _imported: false, _reason: insertErr?.message });
          }
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
