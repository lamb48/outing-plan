/**
 * カテゴリ定義と変換ユーティリティ
 */

export interface Category {
  value: string;
  label: string;
  placesType: string;
}

export const CATEGORIES: Category[] = [
  { value: "レストラン", label: "レストラン", placesType: "restaurant" },
  { value: "カフェ", label: "カフェ", placesType: "cafe" },
  { value: "観光地", label: "観光地", placesType: "tourist_attraction" },
  { value: "博物館", label: "博物館・美術館", placesType: "museum" },
  { value: "公園", label: "公園", placesType: "park" },
  { value: "ショッピング", label: "ショッピング", placesType: "shopping_mall" },
  { value: "グルメ", label: "グルメ巡り", placesType: "restaurant" },
];

const categoryMap = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.value] = cat.placesType;
    return acc;
  },
  {} as Record<string, string>,
);

const reverseCategoryMap = CATEGORIES.reduce(
  (acc, cat) => {
    if (!acc[cat.placesType]) {
      acc[cat.placesType] = cat.value;
    }
    return acc;
  },
  {} as Record<string, string>,
);

export function mapCategoryToPlacesType(category: string): string {
  return categoryMap[category] || category;
}

export function mapPlacesTypeToCategory(placesType: string): string {
  return reverseCategoryMap[placesType] || placesType;
}
