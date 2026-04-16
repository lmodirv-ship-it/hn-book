import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const BookSchema = z.object({
  name: z.string().min(1),
  category: z.string().default("كتب"),
  price: z.number().default(0),
  pdf_url: z.string().url(),
  image: z.string().url(),
  reference_code: z.string().optional(),
})

const RequestSchema = z.object({
  books: z.array(BookSchema).min(1).max(50),
})

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!roleCheck) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse & validate
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { books } = parsed.data;

    // Insert all books — collect results per book
    const results: Array<{ name: string; success: boolean; id?: string; error?: string }> = [];

    // Use service role for insert to bypass RLS (we already verified admin)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    for (const book of books) {
      const { data, error } = await serviceClient
        .from("products")
        .insert({
          name: book.name,
          category: book.category,
          price: book.price,
          pdf_url: book.pdf_url,
          image: book.image,
          reference_code: book.reference_code || null,
        })
        .select("id")
        .single();

      if (error) {
        results.push({ name: book.name, success: false, error: error.message });
      } else {
        results.push({ name: book.name, success: true, id: data.id });
      }
    }

    const success = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ success, failed, results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
