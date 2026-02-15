import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { PlanForm } from "@/components/plan/PlanForm";
import { PUBLIC_IMAGES } from "@/lib/supabase/storage";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <Header user={user} />

      {user ? (
        <main className="min-h-screen">
          <div
            className="relative h-screen bg-cover bg-center"
            style={{
              backgroundImage: `url('${PUBLIC_IMAGES.heroBackground}')`,
            }}
          >
            <div className="absolute inset-0 bg-black/40" />

            <div className="relative container max-w-4xl mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col justify-center items-center text-center pt-20">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-5xl 2xl:text-6xl font-extrabold text-white mb-4 sm:mb-6 md:mb-8 tracking-tight leading-tight">
                どこへおでかけしますか？
              </h1>
              <p className="text-base sm:text-xl md:text-2xl font-light text-white/90 mb-6 sm:mb-10 md:mb-12 tracking-wide">
                あなたにぴったりのプランを作成します
              </p>

              <div className="w-full max-w-2xl">
                <PlanForm />
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="min-h-screen">
          <div
            className="relative h-screen bg-cover bg-center"
            style={{
              backgroundImage: `url('${PUBLIC_IMAGES.heroBackground}')`,
            }}
          >
            <div className="absolute inset-0 bg-black/50" />

            <div className="relative container max-w-4xl mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col justify-center items-center text-center pt-20">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-5xl 2xl:text-6xl font-extrabold text-white mb-4 sm:mb-6 md:mb-8 tracking-tight leading-tight">
                どこへおでかけしますか？
              </h1>
              <p className="text-base sm:text-xl md:text-2xl font-light text-white/90 mb-6 sm:mb-10 md:mb-12 tracking-wide">
                あなたにぴったりのプランを作成します
              </p>

              <Link
                href="/auth/login"
                className="inline-block rounded-full bg-cyan-500 hover:bg-cyan-600 px-6 sm:px-8 py-3 sm:py-4 text-white text-base sm:text-lg font-semibold transition-colors shadow-lg"
              >
                ログインして始める
              </Link>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
