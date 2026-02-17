import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン",
  description: "OutingPlanにログインして、おでかけプランを作成しましょう。",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
