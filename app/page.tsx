import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            AIがあなたの最適なおでかけプランを作成
          </h2>
          <p className="text-lg text-gray-600">
            現在地と予算を入力するだけで、周辺スポットを組み合わせたプランを提案します
          </p>
        </div>

        {user ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>プラン作成</CardTitle>
              <CardDescription>
                位置情報、予算、カテゴリ、時間を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                プラン作成フォームは準備中です
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-lg text-gray-600 mb-4">
                  プランを作成するにはログインが必要です
                </p>
                <a
                  href="/auth/login"
                  className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors"
                >
                  ログインする
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {user && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              ログイン中: {user.email}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
