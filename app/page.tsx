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

            <div className="relative container mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-4 pt-20 text-center sm:px-6 md:px-8">
              <h1 className="mb-4 text-3xl leading-tight font-extrabold tracking-tight text-white sm:mb-6 sm:text-4xl md:mb-8 md:text-5xl lg:text-5xl xl:text-5xl 2xl:text-6xl">
                どこへおでかけしますか？
              </h1>
              <p className="mb-6 text-base font-light tracking-wide text-white/90 sm:mb-10 sm:text-xl md:mb-12 md:text-2xl">
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

            <div className="relative container mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-4 pt-20 text-center sm:px-6 md:px-8">
              <h1 className="mb-4 text-3xl leading-tight font-extrabold tracking-tight text-white sm:mb-6 sm:text-4xl md:mb-8 md:text-5xl lg:text-5xl xl:text-5xl 2xl:text-6xl">
                どこへおでかけしますか？
              </h1>
              <p className="mb-6 text-base font-light tracking-wide text-white/90 sm:mb-10 sm:text-xl md:mb-12 md:text-2xl">
                あなたにぴったりのプランを作成します
              </p>

              <Link
                href="/auth/login"
                className="inline-block rounded-full bg-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-cyan-600 sm:px-8 sm:py-4 sm:text-lg"
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
