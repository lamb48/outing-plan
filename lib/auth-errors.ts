/**
 * Supabase認証エラーメッセージを日本語に変換
 */
export function translateAuthError(error: string): string {
  const errorMessages: Record<string, string> = {
    "Invalid login credentials": "メールアドレスまたはパスワードが正しくありません",
    "Invalid email or password": "メールアドレスまたはパスワードが正しくありません",
    "User already registered": "このメールアドレスは既に登録されています",
    "Password should be at least 8 characters": "パスワードは8文字以上である必要があります",
    "Signup requires a valid password": "有効なパスワードを入力してください",
    "Failed to fetch": "ネットワークエラーが発生しました。インターネット接続を確認してください",
    "Network request failed": "ネットワークエラーが発生しました",
    "Too many requests": "リクエストが多すぎます。しばらく待ってから再度お試しください",
  };

  if (errorMessages[error]) {
    return errorMessages[error];
  }

  for (const [key, value] of Object.entries(errorMessages)) {
    if (error.includes(key)) {
      return value;
    }
  }

  return "エラーが発生しました。もう一度お試しください";
}
