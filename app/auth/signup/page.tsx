"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footprints, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { translateAuthError } from "@/lib/auth-errors";
import { PUBLIC_IMAGES } from "@/lib/supabase/storage";

const signupSchema = z
  .object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z
      .string()
      .min(8, "8文字以上である必要があります")
      .regex(/[a-z]/, "小文字を含む必要があります")
      .regex(/[A-Z]/, "大文字を含む必要があります")
      .regex(/[0-9]/, "数字を含む必要があります")
      .regex(/[^a-zA-Z0-9]/, "記号を含む必要があります"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    setLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setIsGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Error signing up:", error.message);
        setError("アカウント作成に失敗しました");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("エラーが発生しました");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${PUBLIC_IMAGES.heroBackground}')`,
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <div className="rounded-xl bg-cyan-500 p-2">
                <Footprints className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-800 sm:text-3xl">
                おでかけプランナー
              </CardTitle>
            </div>
            <CardDescription className="text-center text-base">
              あなたにぴったりのプランを作成します
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isGoogleLoading}
                className="h-12 w-full border-2 border-gray-300 bg-white font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:ring-0 focus:outline-none"
              >
                {isGoogleLoading ? (
                  <span>アカウント作成中...</span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g fill="none" fillRule="evenodd">
                        <path
                          d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                          fill="#4285F4"
                        />
                        <path
                          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                          fill="#34A853"
                        />
                        <path
                          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                          fill="#EA4335"
                        />
                      </g>
                    </svg>
                    Googleでアカウント作成
                  </span>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 font-medium text-gray-500">または</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  メールアドレス
                </Label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    className="h-11 border-gray-300 pl-10 focus:border-cyan-500 focus:ring-0 focus:outline-none"
                    {...register("email")}
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <span>⚠</span> {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  パスワード
                </Label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    className="h-11 border-gray-300 pl-10 focus:border-cyan-500 focus:ring-0 focus:outline-none"
                    {...register("password")}
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <span>⚠</span> {errors.password.message}
                  </p>
                )}
                <p className="text-center text-xs text-gray-500">
                  英大小文字・数字・記号をそれぞれ含めてください
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                  パスワード（確認）
                </Label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    className="h-11 border-gray-300 pl-10 focus:border-cyan-500 focus:ring-0 focus:outline-none"
                    {...register("confirmPassword")}
                    disabled={loading}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="flex items-center gap-1 text-sm text-red-600">
                    <span>⚠</span> {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-12 w-full bg-cyan-500 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-cyan-600 hover:shadow-xl focus:ring-0 focus:outline-none"
                disabled={loading}
              >
                {loading ? "登録中..." : "アカウントを作成"}
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6 pb-3">
              <div className="space-y-2 text-center">
                <p className="text-sm text-gray-600">既にアカウントをお持ちですか？</p>
                <Link
                  href="/auth/login"
                  className="font-medium text-cyan-600 transition-colors hover:text-cyan-700"
                >
                  ログインはこちら
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
