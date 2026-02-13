"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Error logging in:", error.message);
        setError("ログインに失敗しました");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("エラーが発生しました");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">おでかけプラン</CardTitle>
          <CardDescription className="text-center">
            AIがあなたの最適なおでかけプランを作成します
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {message === "check_email" && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-600">
                確認メールを送信しました。メールをご確認ください。
              </div>
            )}

            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@example.com"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                {...register("password")}
                disabled={isLoading}
              />
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">または</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full"
            >
              {isGoogleLoading ? "ログイン中..." : "Googleでログイン"}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-center text-sm text-gray-600">
              アカウントをお持ちでない方は{" "}
              <Link href="/auth/signup" className="text-blue-600 hover:underline">
                新規登録
              </Link>
            </p>
            <p className="text-center text-xs text-gray-500">
              ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
