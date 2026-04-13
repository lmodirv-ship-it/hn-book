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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Step 1: Use AI to search for free books on open source sites
    const searchPrompt = `Search for ${bookCount} free PDF books about "${query}" available on these open-source platforms:
- Internet Archive (archive.org)
- OpenLibrary (openlibrary.org)
- Project Gutenberg (gutenberg.org)
- Google Books (books.google.com) - free/preview only
- Standard Ebooks (standardebooks.org)
- ManyBooks (manybooks.net)

For each book provide REAL, VERIFIED information. Only include books that are actually freely available.
For download URLs, use the actual archive.org or gutenberg.org download links.
For cover images, use the Open Library Covers API: https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg or archive.org thumbnails.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a librarian expert. You find real, freely available books from open-source platforms. Only return books that genuinely exist and are freely downloadable. Never invent fake URLs.",
          },
          { role: "user", content: searchPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_books",
            description: "Return discovered free books from open-source platforms",
            parameters: {
              type: "object",
              properties: {
                books: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Book title" },
                      author: { type: "string", description: "Author name" },
                      description: { type: "string", description: "Short description in Arabic" },
                      category: { type: "string", description: "Category/genre" },
                      language: { type: "string", description: "Book language (en, ar, fr, etc.)" },
                      year: { type: "number", description: "Publication year" },
                      pages: { type: "number", description: "Approximate page count" },
                      source: { type: "string", description: "Source platform name (Archive.org, Gutenberg, etc.)" },
                      source_url: { type: "string", description: "URL to the book page on the platform" },
                      download_url: { type: "string", description: "Direct PDF download URL" },
                      cover_url: { type: "string", description: "Cover image URL" },
                      isbn: { type: "string", description: "ISBN if available" },
                    },
                    required: ["title", "author", "description", "source", "source_url", "download_url"],
                  },
                },
              },
              required: ["books"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_books" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "معدل الطلبات مرتفع، حاول لاحقاً" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { books } = JSON.parse(toolCall.function.arguments);

    // Step 2: Verify URLs are accessible (quick HEAD check)
    const verifiedBooks = [];
    for (const book of books) {
      try {
        const headResp = await fetch(book.download_url, { method: "HEAD", redirect: "follow" });
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
          // Download the PDF
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

          // Download cover if available
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
            category: book.category || "كتب عامة",
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
        success: true,
        query,
        total: books.length,
        verified: verifiedBooks.filter(b => b._verified).length,
        imported: imported.filter(b => b._imported).length,
        books: imported,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Return search results without importing
    return new Response(JSON.stringify({
      success: true,
      query,
      total: books.length,
      verified: verifiedBooks.filter(b => b._verified).length,
      books: verifiedBooks,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("search-books-web error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
