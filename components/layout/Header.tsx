"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
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

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (user: SupabaseUser) => {
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "ユーザー";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-blue-600">おでかけプラン</h1>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="hidden text-sm text-gray-600 sm:inline-block">
                {getDisplayName(user)}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {user.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>マイアカウント</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-sm text-gray-600">{user.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => router.push("/auth/login")}>ログイン</Button>
          )}
        </div>
      </div>
    </header>
  );
}
