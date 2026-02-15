import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/place-photo/[reference]
 * Google Places Photo APIのプロキシエンドポイント
 * サーバー側でAPIキーを使って写真を取得し、クライアントに返す
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const { reference } = await params;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY is not set");
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // クエリパラメータから画像サイズを取得（デフォルト: 400px）
    const searchParams = request.nextUrl.searchParams;
    const maxWidth = searchParams.get("maxwidth") || "400";

    // Google Places Photo APIにリクエスト
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${reference}&key=${apiKey}`;

    const response = await fetch(photoUrl);

    if (!response.ok) {
      console.error(
        `Failed to fetch photo from Google Places API: ${response.status} ${response.statusText}`,
      );
      return NextResponse.json({ error: "Failed to fetch photo" }, { status: response.status });
    }

    // 画像データを取得
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // 画像を返す（キャッシュヘッダー付き）
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400", // 24時間キャッシュ
      },
    });
  } catch (error) {
    console.error("Error in place-photo proxy:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
