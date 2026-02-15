"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Footprints, History } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface HeaderProps {
  user: SupabaseUser | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
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

  return (
    <header className="fixed top-0 w-full z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="w-full px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-500">
              <Footprints className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-base sm:text-lg font-semibold text-gray-900">
              おでかけプランナー
            </span>
          </Link>

          {/* ナビゲーション */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <Link
                href="/history"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm sm:text-base md:text-lg text-gray-700 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
              >
                <History className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="hidden sm:inline">履歴</span>
              </Link>
              <DropdownMenu key={user.id}>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none" suppressHydrationWarning>
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage src={getUserAvatar(user)} alt={getDisplayName(user)} />
                      <AvatarFallback className="bg-cyan-500 text-white text-xs sm:text-sm">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-1">
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
