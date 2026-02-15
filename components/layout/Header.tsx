"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Footprints, History, Home } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface HeaderProps {
  user: SupabaseUser | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const getDisplayName = (user: SupabaseUser) => {
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  };

  const getUserAvatar = (user: SupabaseUser) => {
    return user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
  };

  const isHistoryPage = pathname === "/history";
  const isHomePage = pathname === "/";

  return (
    <header className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white shadow-sm">
      <div className="w-full px-4 py-4 sm:px-6 sm:py-5 md:px-8">
        <div className="flex items-center justify-between">
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="rounded-lg bg-cyan-500 p-1.5 sm:rounded-xl sm:p-2">
              <Footprints className="h-5 w-5 text-white sm:h-6 sm:w-6" />
            </div>
            <span className="text-base font-semibold text-gray-900 sm:text-lg">
              おでかけプランナー
            </span>
          </Link>

          {/* ナビゲーション */}
          {user && (
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors sm:gap-2 sm:px-3 sm:py-2 sm:text-base md:px-4 md:text-lg ${
                    isHomePage ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Home className="h-6 w-6 sm:h-7 sm:w-7" />
                  <span className="hidden sm:inline">ホーム</span>
                </Link>
                <Link
                  href="/history"
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors sm:gap-2 sm:px-3 sm:py-2 sm:text-base md:px-4 md:text-lg ${
                    isHistoryPage ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <History className="h-6 w-6 sm:h-7 sm:w-7" />
                  <span className="hidden sm:inline">履歴</span>
                </Link>
              </div>
              <DropdownMenu key={user.id}>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none" suppressHydrationWarning>
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage src={getUserAvatar(user)} alt={getDisplayName(user)} />
                      <AvatarFallback className="bg-cyan-500 text-xs text-white sm:text-sm">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="mt-1 w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
