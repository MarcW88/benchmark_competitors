export interface RankedKeyword {
  keyword: string;
  position: number;
  url: string;
  search_volume: number;
  cpc: number;
  competition: number;
  estimated_traffic: number;
  keyword_difficulty: number;
  is_paid: boolean;
}

export interface KeywordForSite {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  keyword_difficulty: number;
  categories: string[];
}

export interface HistoricalOverviewMonth {
  date: string;
  pos_1: number;
  pos_2_3: number;
  pos_4_10: number;
  pos_11_20: number;
  pos_21_100: number;
  traffic: number;
}

const BASE_URL = "https://api.dataforseo.com/v3";

function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set");
  }
  const cred = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${cred}`;
}

async function dataForSEOPost<T>(path: string, body: object[]): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRankedKeyword(item: any): RankedKeyword {
  const serp = item.ranked_serp_element?.serp_item ?? {};
  return {
    keyword: item.keyword_data?.keyword ?? "",
    position: serp.rank_absolute ?? serp.position ?? 0,
    url: serp.url ?? "",
    search_volume: item.keyword_data?.keyword_info?.search_volume ?? 0,
    cpc: item.keyword_data?.keyword_info?.cpc ?? 0,
    competition: item.keyword_data?.keyword_info?.competition ?? 0,
    estimated_traffic: serp.etv ?? 0,
    keyword_difficulty:
      item.keyword_data?.keyword_properties?.keyword_difficulty ?? 0,
    is_paid: serp.is_paid ?? false,
  };
}

export async function getRankedKeywords(
  target: string,
  locationCode: number,
  languageCode: string,
  onlyOrganic: boolean = true
): Promise<RankedKeyword[]> {
  const LIMIT = 1000;
  let offset = 0;
  const all: RankedKeyword[] = [];

  while (true) {
    const filters: unknown[] = [];
    if (onlyOrganic) {
      filters.push(["ranked_serp_element.serp_item.type", "<>", "paid"]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      target,
      location_code: locationCode,
      language_code: languageCode,
      load_rank_absolute: true,
      limit: LIMIT,
      offset,
    };
    if (filters.length > 0) payload.filters = filters;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await dataForSEOPost<any>(
      "/dataforseo_labs/google/ranked_keywords/live",
      [payload]
    );

    const task = data?.tasks?.[0];
    if (!task || task.status_code !== 20000) break;

    const items = task.result?.[0]?.items ?? [];
    all.push(...items.map(parseRankedKeyword));

    if (items.length < LIMIT) break;
    offset += LIMIT;
  }

  return all;
}

export async function getKeywordsForSite(
  target: string,
  locationCode: number,
  languageCode: string
): Promise<KeywordForSite[]> {
  const LIMIT = 1000;
  let offset = 0;
  const all: KeywordForSite[] = [];

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await dataForSEOPost<any>(
      "/dataforseo_labs/google/keywords_for_site/live",
      [
        {
          target,
          location_code: locationCode,
          language_code: languageCode,
          limit: LIMIT,
          offset,
        },
      ]
    );

    const task = data?.tasks?.[0];
    if (!task || task.status_code !== 20000) break;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: KeywordForSite[] = (task.result?.[0]?.items ?? []).map((item: any) => ({
      keyword: item.keyword ?? "",
      search_volume: item.keyword_info?.search_volume ?? 0,
      cpc: item.keyword_info?.cpc ?? 0,
      competition: item.keyword_info?.competition ?? 0,
      keyword_difficulty: item.keyword_properties?.keyword_difficulty ?? 0,
      categories: item.categories ?? [],
    }));

    all.push(...items);
    if (items.length < LIMIT) break;
    offset += LIMIT;
  }

  return all;
}

export async function getHistoricalRankOverview(
  target: string,
  locationCode: number,
  languageCode: string,
  dateFrom: string,
  dateTo: string
): Promise<HistoricalOverviewMonth[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await dataForSEOPost<any>(
    "/dataforseo_labs/google/historical_rank_overview/live",
    [
      {
        target,
        location_code: locationCode,
        language_code: languageCode,
        date_from: dateFrom,
        date_to: dateTo,
      },
    ]
  );

  const task = data?.tasks?.[0];
  if (!task || task.status_code !== 20000) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (task.result ?? []).map((month: any) => ({
    date: month.date ?? "",
    pos_1: month.metrics?.organic?.pos_1 ?? 0,
    pos_2_3: month.metrics?.organic?.pos_2_3 ?? 0,
    pos_4_10: month.metrics?.organic?.pos_4_10 ?? 0,
    pos_11_20: month.metrics?.organic?.pos_11_20 ?? 0,
    pos_21_100: month.metrics?.organic?.pos_21_100 ?? 0,
    traffic: month.metrics?.organic?.etv ?? 0,
  }));
}
