import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "新規登録",
  description: "OutingPlanに無料で登録して、あなただけのおでかけプランを作成しましょう。",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
