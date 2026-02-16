import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * リダイレクト先URLが安全かチェック
 * Open Redirect脆弱性を防ぐため、相対パスのみ許可
 */
function isSafeRedirectUrl(url: string | null): boolean {
  if (!url) return false;

  // 絶対URLの場合は拒否
  try {
    new URL(url);
    return false;
  } catch {
    // 相対パスの場合のみ許可
    // `/`で始まり、`//`で始まらないこと（プロトコル相対URL防止）
    return url.startsWith("/") && !url.startsWith("//");
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = isSafeRedirectUrl(nextParam) ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    const errorMessage = error?.message || "認証処理中にエラーが発生しました";
    return NextResponse.redirect(
      `${origin}/auth/login?error=callback_error&message=${encodeURIComponent(errorMessage)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=callback_error&message=${encodeURIComponent("認証コードが見つかりません")}`,
  );
}
