export interface GapKeyword {
  keyword: string;
  search_volume: number;
  cpc: number;
  keyword_difficulty: number;
  positions: Record<string, number>;
  urls: Record<string, string>;
}
