import { Langfuse } from 'langfuse'

/**
 * Langfuseクライアントのシングルトン
 * LLMのトレーシング、プロンプト管理、コスト分析に使用
 */

let langfuseInstance: Langfuse | null = null

export function getLangfuseClient(): Langfuse | null {
  // 環境変数が設定されていない場合はnullを返す（Langfuseはオプショナル）
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    console.warn('Langfuse keys not configured. Tracing disabled.')
    return null
  }

  // シングルトンパターン
  if (!langfuseInstance) {
    langfuseInstance = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
    })
  }

  return langfuseInstance
}

/**
 * トレースを開始
 */
export function createTrace(params: {
  name: string
  userId?: string
  sessionId?: string
  input?: unknown
  metadata?: Record<string, any>
}) {
  const langfuse = getLangfuseClient()
  if (!langfuse) return null

  return langfuse.trace({
    name: params.name,
    userId: params.userId,
    sessionId: params.sessionId,
    input: params.input,
    metadata: params.metadata,
  })
}

/**
 * Langfuseインスタンスをフラッシュ（バッファをサーバーに送信）
 * API Routeの終了時に呼び出す
 */
export async function flushLangfuse() {
  const langfuse = getLangfuseClient()
  if (!langfuse) return

  await langfuse.flushAsync()
}

/**
 * Langfuseをシャットダウン
 * アプリケーション終了時に呼び出す
 */
export async function shutdownLangfuse() {
  const langfuse = getLangfuseClient()
  if (!langfuse) return

  await langfuse.shutdownAsync()
}
