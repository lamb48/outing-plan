/**
 * Supabaseベースのレート制限ユーティリティ
 *
 * PostgreSQLを使用して、指定された時間枠内のリクエスト数を制限します。
 * 開発環境では制限を大幅に緩和し、本番環境でのみ厳格な制限を適用します。
 */

import { createClient } from "@/lib/supabase/server";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * レート制限をチェック（Supabase版）
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  console.log("[RateLimit] Called with identifier:", identifier);

  const supabase = await createClient();
  const now = new Date();
  const resetTime = new Date(now.getTime() + windowMs);

  // トランザクション内で実行（競合を防ぐ）
  const { data: existing, error: selectError } = await supabase
    .from("rate_limits")
    .select("count, reset_time")
    .eq("identifier", identifier)
    .single();

  console.log("[RateLimit] Select result:", { existing, selectError });

  // エラーが発生した場合（レコードが存在しない場合も含む）
  if (selectError || !existing) {
    console.log("[RateLimit] Creating new entry");

    // 新規エントリを作成
    const { data: insertData, error: insertError } = await supabase
      .from("rate_limits")
      .upsert({
        identifier,
        count: 1,
        reset_time: resetTime.toISOString(),
      })
      .select()
      .single();

    console.log("[RateLimit] Insert result:", { insertData, insertError });

    if (insertError) {
      console.error("Failed to create rate limit entry:", insertError);
      // エラー時は制限を適用しない（フェイルオープン）
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: resetTime.getTime(),
      };
    }

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime.getTime(),
    };
  }

  const existingResetTime = new Date(existing.reset_time).getTime();

  // リセット時刻を過ぎている場合
  if (existingResetTime < now.getTime()) {
    const { error: updateError } = await supabase
      .from("rate_limits")
      .update({
        count: 1,
        reset_time: resetTime.toISOString(),
      })
      .eq("identifier", identifier);

    if (updateError) {
      console.error("Failed to reset rate limit entry:", updateError);
    }

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime.getTime(),
    };
  }

  // カウントが制限未満の場合
  if (existing.count < limit) {
    const { error: updateError } = await supabase
      .from("rate_limits")
      .update({
        count: existing.count + 1,
      })
      .eq("identifier", identifier);

    if (updateError) {
      console.error("Failed to increment rate limit count:", updateError);
    }

    return {
      success: true,
      limit,
      remaining: limit - (existing.count + 1),
      reset: existingResetTime,
    };
  }

  // 制限超過
  return {
    success: false,
    limit,
    remaining: 0,
    reset: existingResetTime,
  };
}

/**
 * リクエストからIPアドレスを取得
 */
export function getClientIp(request: Request): string {
  // Vercelやその他のプロキシ環境を考慮
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // フォールバック（開発環境用）
  return "127.0.0.1";
}

/**
 * レート制限の設定プリセット
 * 開発環境では制限を大幅に緩和
 */
const isDevelopment = process.env.NODE_ENV === "development";

export const RATE_LIMITS = {
  // プラン生成: 本番10リクエスト/分、開発1000リクエスト/分
  PLAN_GENERATE: {
    limit: isDevelopment ? 1000 : 10,
    windowMs: 60 * 1000,
  },
} as const;
