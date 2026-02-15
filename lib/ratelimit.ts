/**
 * インメモリレート制限ユーティリティ
 *
 * Sliding Window アルゴリズムを使用して、指定された時間枠内のリクエスト数を制限します。
 * 開発環境では制限を大幅に緩和し、本番環境でのみ厳格な制限を適用します。
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// 定期的に古いエントリをクリーンアップ（メモリリーク防止）
const CLEANUP_INTERVAL = 60 * 1000; // 1分
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * レート制限をチェック
 */
export function rateLimit(identifier: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime,
    };
  }

  if (entry.count < limit) {
    entry.count++;
    rateLimitMap.set(identifier, entry);
    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetTime,
    };
  }

  return {
    success: false,
    limit,
    remaining: 0,
    reset: entry.resetTime,
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
  // プラン取得: 本番30リクエスト/分、開発1000リクエスト/分
  PLAN_READ: {
    limit: isDevelopment ? 1000 : 30,
    windowMs: 60 * 1000,
  },
} as const;
