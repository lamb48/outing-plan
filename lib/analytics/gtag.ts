export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";

type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// gtag.js ロード前に呼ばれたイベントを dataLayer にキューイングするためのラッパーを早期定義。
// afterInteractive スクリプトより先に useEffect が発火して page_view がドロップされる
// Race Condition を防ぐ。gtag.js ロード後、dataLayer のキューが自動処理される。
if (typeof window !== "undefined" && GA_MEASUREMENT_ID) {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }
}

const isAnalyticsReady = () => {
  return typeof window !== "undefined" && Boolean(GA_MEASUREMENT_ID);
};

export const trackPageView = (path: string) => {
  if (!isAnalyticsReady()) return;

  window.gtag!("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
};

export const trackEvent = (eventName: string, params?: GtagParams) => {
  if (!isAnalyticsReady()) return;
  window.gtag!("event", eventName, params ?? {});
};
