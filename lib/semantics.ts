const STOP_WORDS = new Set([
  // French
  "de","du","des","le","la","les","un","une","au","aux","en","dans","sur","par","pour",
  "avec","à","et","ou","que","qui","ne","pas","se","ce","est","sont","ont","a","y",
  "il","elle","ils","elles","je","tu","nous","vous","mon","ton","son","ma","ta","sa",
  "nos","vos","ses","leur","leurs","dont","si","mais","car","ni","donc","or","comment",
  "quoi","quel","quelle","quels","quelles","combien","tout","tous","toutes","toute",
  "plus","moins","très","bien","aussi","même","encore","comme","quand","puis","après",
  "avant","entre","vers","chez","sans","sous","lors","depuis","selon","jusqu",
  // English
  "the","of","in","to","for","is","on","at","with","by","from","and","or","a","an",
  "how","what","where","when","why","which","who","this","that","these","those",
  "my","your","his","her","its","our","their","am","are","was","were","be","been",
  "have","has","had","do","does","did","will","would","could","should","may","might",
  "not","no","more","most","best","top","get","find","use","make","new","free",
  "can","than","then","so","if","up","out","about","into","over","after","before",
]);

function tokenize(kw: string): string[] {
  return kw
    .toLowerCase()
    .split(/[\s\-_\/,;:&+]+/)
    .map((w) => w.replace(/[^a-z0-9àâäéèêëîïôùûü]/gi, ""))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Builds a Map<category_label, keyword[]> from a list of keywords.
 * Categories are derived from the most frequent meaningful tokens.
 */
export function extractCategories(
  keywords: string[],
  { minSize = 3, maxCategories = 12 } = {}
): Map<string, string[]> {
  const wordFreq = new Map<string, number>();

  for (const kw of keywords) {
    const seen = new Set<string>();
    for (const token of tokenize(kw)) {
      if (!seen.has(token)) {
        wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
        seen.add(token);
      }
    }
  }

  // Seeds = most frequent words, up to maxCategories * 2 candidates
  const seeds = [...wordFreq.entries()]
    .filter(([, freq]) => freq >= minSize)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCategories * 2)
    .map(([word]) => word);

  const categories = new Map<string, string[]>();
  const assigned = new Set<string>();

  for (const seed of seeds) {
    if (categories.size >= maxCategories) break;
    const matching = keywords.filter(
      (kw) => !assigned.has(kw) && kw.toLowerCase().includes(seed)
    );
    if (matching.length >= minSize) {
      // Capitalize seed for display
      const label = seed.charAt(0).toUpperCase() + seed.slice(1);
      categories.set(label, matching);
      matching.forEach((kw) => assigned.add(kw));
    }
  }

  const unassigned = keywords.filter((kw) => !assigned.has(kw));
  if (unassigned.length > 0) {
    categories.set("Autre", unassigned);
  }

  return categories;
}

/**
 * Returns a Map<keyword, category_label> for quick lookup.
 */
export function buildKeywordCategoryMap(
  keywords: string[],
  options?: { minSize?: number; maxCategories?: number }
): Map<string, string> {
  const cats = extractCategories(keywords, options);
  const map = new Map<string, string>();
  cats.forEach((kws, cat) => kws.forEach((kw) => map.set(kw, cat)));
  return map;
}

/**
 * Returns sorted category names by size (descending), excluding "Autre".
 */
export function getTopCategories(
  categoryMap: Map<string, string>,
  topN = 10
): string[] {
  const freq = new Map<string, number>();
  categoryMap.forEach((cat) => freq.set(cat, (freq.get(cat) || 0) + 1));
  return [...freq.entries()]
    .filter(([cat]) => cat !== "Autre")
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([cat]) => cat);
}
