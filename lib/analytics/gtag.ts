export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";

type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const isAnalyticsReady = () => {
  return (
    typeof window !== "undefined" && typeof window.gtag === "function" && Boolean(GA_MEASUREMENT_ID)
  );
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
