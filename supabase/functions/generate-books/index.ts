import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, count, language } = await req.json();
    const bookCount = Math.min(Math.max(count || 5, 1), 20);
    const lang = language || "ar";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = lang === "ar"
      ? `أنت مساعد لتوليد بيانات كتب عربية واقعية. أنشئ كتباً بأسماء عربية أصلية وأوصاف احترافية.`
      : `You are an assistant that generates realistic book data. Create books with authentic names and professional descriptions.`;

    const userPrompt = lang === "ar"
      ? `أنشئ ${bookCount} كتاب في تصنيف "${category}". لكل كتاب أعطني: اسم عربي احترافي، وصف قصير (سطر واحد)، وصف مفصل (3 أسطر)، اسم المؤلف العربي، عدد الصفحات (50-500)، السعر (5-49 دولار)، السعر الأصلي (أعلى من السعر)، 4 مميزات للكتاب. اجعل الأسماء متنوعة وواقعية.`
      : `Generate ${bookCount} books in the "${category}" category. For each book provide: professional name, short description (1 line), detailed description (3 lines), author name, page count (50-500), price (5-49 USD), original price (higher than price), 4 features. Make names diverse and realistic.`;

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
            description: "Return generated book data",
            parameters: {
              type: "object",
              properties: {
                books: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      short_description: { type: "string" },
                      description: { type: "string" },
                      author: { type: "string" },
                      pages: { type: "number" },
                      price: { type: "number" },
                      original_price: { type: "number" },
                      features: { type: "array", items: { type: "string" } },
                    },
                    required: ["name", "short_description", "description", "author", "pages", "price", "original_price", "features"],
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

    // Get current product count for numbering
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count: existingCount } = await supabase.from("products").select("*", { count: "exact", head: true });
    let nextNum = (existingCount || 0) + 1;

    // Insert books
    const insertedBooks = [];
    for (const book of books) {
      const bookCode = `HNB-${String(nextNum).padStart(4, "0")}`;
      
      const { data: product, error } = await supabase.from("products").insert({
        name: book.name,
        short_description: book.short_description,
        description: `${book.description}\n\nالمؤلف: ${book.author}\nعدد الصفحات: ${book.pages}`,
        category: category || "كتب عامة",
        price: book.price,
        original_price: book.original_price,
        features: book.features,
        badge: bookCode,
        is_active: true,
      }).select().single();

      if (!error && product) {
        insertedBooks.push(product);
        nextNum++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: insertedBooks.length, 
      books: insertedBooks 
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
