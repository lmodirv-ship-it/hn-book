import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, count } = await req.json();
    const bookCount = Math.min(Math.max(count || 5, 1), 20);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a multilingual book data generator. For each book, generate content in Arabic, French, and English. Make books realistic with authentic names and authors for each language.`;

    const userPrompt = `Generate ${bookCount} books in the "${category}" category. For EACH book, provide the name, short description, detailed description, author name, and 4 features in ALL THREE languages (Arabic, French, English). Also provide page count (50-500), price (5-49 USD), and original price (higher). Make each language version feel native, not translated.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_books",
            description: "Return generated multilingual book data",
            parameters: {
              type: "object",
              properties: {
                books: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      ar: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          short_description: { type: "string" },
                          description: { type: "string" },
                          author: { type: "string" },
                          features: { type: "array", items: { type: "string" } },
                        },
                        required: ["name", "short_description", "description", "author", "features"],
                      },
                      fr: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          short_description: { type: "string" },
                          description: { type: "string" },
                          author: { type: "string" },
                          features: { type: "array", items: { type: "string" } },
                        },
                        required: ["name", "short_description", "description", "author", "features"],
                      },
                      en: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          short_description: { type: "string" },
                          description: { type: "string" },
                          author: { type: "string" },
                          features: { type: "array", items: { type: "string" } },
                        },
                        required: ["name", "short_description", "description", "author", "features"],
                      },
                      pages: { type: "number" },
                      price: { type: "number" },
                      original_price: { type: "number" },
                    },
                    required: ["ar", "fr", "en", "pages", "price", "original_price"],
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
      if (status === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد لحسابك" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { books } = JSON.parse(toolCall.function.arguments);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count: existingCount } = await supabase.from("products").select("*", { count: "exact", head: true });
    let nextNum = (existingCount || 0) + 1;

    const insertedBooks = [];
    for (const book of books) {
      const bookCode = `HNB-${String(nextNum).padStart(4, "0")}`;

      // Build multilingual description
      const fullDesc = [
        `📖 ${book.ar.description}`,
        `المؤلف: ${book.ar.author} | عدد الصفحات: ${book.pages}`,
        ``,
        `🇫🇷 ${book.fr.description}`,
        `Auteur: ${book.fr.author}`,
        ``,
        `🇬🇧 ${book.en.description}`,
        `Author: ${book.en.author}`,
      ].join("\n");

      // Combine multilingual name
      const multiName = book.ar.name;

      // Combine features from all languages
      const allFeatures = [
        ...book.ar.features,
        `🇫🇷 ${book.fr.name}`,
        `🇬🇧 ${book.en.name}`,
      ];

      const { data: product, error } = await supabase.from("products").insert({
        name: multiName,
        short_description: `${book.ar.short_description} | ${book.fr.short_description} | ${book.en.short_description}`,
        description: fullDesc,
        category: category || "كتب عامة",
        price: book.price,
        original_price: book.original_price,
        features: allFeatures,
        badge: bookCode,
        is_active: true,
      }).select().single();

      if (!error && product) {
        insertedBooks.push({ ...product, _multilingual: book });
        nextNum++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      count: insertedBooks.length,
      books: insertedBooks,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-books error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
