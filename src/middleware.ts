import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass middleware for Stripe webhook
  if (
    pathname.startsWith("/webhook/stripe") ||
    pathname.startsWith("/public/webhook/stripe")
  ) {
    console.log("Middleware bypassed for:", pathname);
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set(name, value);
          response = NextResponse.next({ request: req });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.delete(name);
          response = NextResponse.next({ request: req });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  console.log("Middleware session check:", {
    pathname,
    session: !!sessionData.session,
    error: sessionError?.message,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public/webhook/stripe).*)",
  ],
};
