import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface ExtractedBook {
  name: string;
  download_url: string;
  category?: string;
  description?: string;
  author?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const formData = await req.formData();
    const catalogFile = formData.get("catalog") as File;
    if (!catalogFile) {
      return new Response(JSON.stringify({ error: "No catalog file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert PDF to base64 for AI processing
    const pdfBytes = await catalogFile.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // Use Gemini to extract book list from the PDF
    const aiResponse = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a book catalog parser. Analyze this PDF and extract ALL books listed in it.
For each book, extract:
- name: the book title
- download_url: the download link/URL if available
- category: the category or genre
- description: a short description if available
- author: the author name if available

Return ONLY a valid JSON array. Example:
[{"name":"Book Title","download_url":"https://...","category":"Programming","description":"A great book","author":"John"}]

If no download URL is found for a book, set download_url to empty string "".
Extract every single book you can find. Be thorough.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 8000,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "AI processing failed", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON from AI response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Could not parse book list from PDF", raw: content }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let books: ExtractedBook[];
    try {
      books = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON from AI", raw: jsonMatch[0] }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ name: string; status: string; id?: string; error?: string }> = [];
    let bookNumber = 1;

    // Get current max book number for sequential numbering
    const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
    const startNumber = (count || 0) + 1;

    for (const book of books) {
      const currentNumber = startNumber + bookNumber - 1;
      const bookCode = `HNB-${String(currentNumber).padStart(4, "0")}`;

      try {
        let pdfStoragePath: string | null = null;
        let pdfPublicUrl: string | null = null;

        // Download book PDF if URL is available
        if (book.download_url && book.download_url.startsWith("http")) {
          try {
            const bookResponse = await fetch(book.download_url);
            if (bookResponse.ok) {
              const bookData = await bookResponse.arrayBuffer();
              const storagePath = `catalog-import/${bookCode}/${Date.now()}.pdf`;

              const { error: uploadErr } = await supabase.storage
                .from("book-files")
                .upload(storagePath, new Uint8Array(bookData), {
                  contentType: "application/pdf",
                  upsert: true,
                });

              if (!uploadErr) {
                pdfStoragePath = `book-files/${storagePath}`;
                pdfPublicUrl = `${SUPABASE_URL}/storage/v1/object/public/book-files/${storagePath}`;
              } else {
                console.error(`Upload error for ${book.name}:`, uploadErr);
              }
            }
          } catch (dlErr) {
            console.error(`Download error for ${book.name}:`, dlErr);
          }
        }

        // Generate a cover image using AI
        let coverUrl: string | null = null;
        try {
          const coverResponse = await fetch("https://ai-gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              prompt: `Professional book cover for "${book.name}" by ${book.author || "Unknown"}. Category: ${book.category || "General"}. Clean modern design with title text prominently displayed.`,
              n: 1,
              size: "512x768",
            }),
          });

          if (coverResponse.ok) {
            const coverData = await coverResponse.json();
            const imageB64 = coverData.data?.[0]?.b64_json;
            if (imageB64) {
              const imageBytes = Uint8Array.from(atob(imageB64), (c) => c.charCodeAt(0));
              const imgPath = `catalog-import/${bookCode}/cover.jpg`;
              const { error: imgUploadErr } = await supabase.storage
                .from("book-images")
                .upload(imgPath, imageBytes, { contentType: "image/jpeg", upsert: true });

              if (!imgUploadErr) {
                coverUrl = `${SUPABASE_URL}/storage/v1/object/public/book-images/${imgPath}`;
              }
            }
          }
        } catch (imgErr) {
          console.error(`Cover gen error for ${book.name}:`, imgErr);
        }

        // Insert product into database
        const { data: product, error: insertErr } = await supabase.from("products").insert({
          name: `${bookCode} - ${book.name}`,
          short_description: book.description || null,
          description: book.description || null,
          category: book.category || "General",
          price: 0,
          image: coverUrl,
          pdf_url: pdfPublicUrl,
          badge: bookCode,
          is_active: true,
          features: [book.author ? `المؤلف: ${book.author}` : ""].filter(Boolean),
        }).select("id").single();

        if (insertErr) throw insertErr;

        // Insert file reference
        if (pdfPublicUrl && pdfStoragePath && product) {
          await supabase.from("product_files").insert({
            product_id: product.id,
            file_type: "pdf" as any,
            file_name: `${bookCode}.pdf`,
            storage_path: pdfStoragePath,
            public_url: pdfPublicUrl,
            is_primary: true,
          });
        }

        // Insert cover reference
        if (coverUrl && product) {
          await supabase.from("product_files").insert({
            product_id: product.id,
            file_type: "image" as any,
            file_name: `${bookCode}-cover.jpg`,
            storage_path: `book-images/catalog-import/${bookCode}/cover.jpg`,
            public_url: coverUrl,
            is_primary: true,
          });
        }

        results.push({ name: book.name, status: "success", id: product?.id });
      } catch (err: any) {
        results.push({ name: book.name, status: "error", error: err.message });
      }

      bookNumber++;
    }

    const successCount = results.filter((r) => r.status === "success").length;
    return new Response(
      JSON.stringify({
        total: books.length,
        success: successCount,
        failed: books.length - successCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Process error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
