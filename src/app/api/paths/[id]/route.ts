import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client (outside handler for performance)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/paths/[id]
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> } // Updated type
) {
  // Await params to resolve the dynamic ID
  const { id } = await context.params;

  try {
    const { data, error } = await supabase
      .from("paths")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
