import { NextRequest, NextResponse } from "next/server";

const BATCH_SIZE = 500;

async function categorizeBatch(
  keywords: string[],
  apiKey: string,
  knownCategories: string[] = []
): Promise<Record<string, string>> {
  const categoryHint =
    knownCategories.length > 0
      ? `\nUse these category names where relevant (you can add new ones if needed): ${knownCategories.join(", ")}.`
      : "";

  const prompt = `You are an expert SEO analyst. Assign each keyword below to a clear semantic category.

Rules:
- Category names must be concise (2–4 words), specific, and in the same language as the majority of keywords
- Examples: "Dog breeds", "Pet food brands", "Puppy training", "Health symptoms", "Price comparison", "Raw diet"
- Detect brand names and assign them "Brand" (or "Brand - [name]" if they need their own group)
- NEVER use "Other", "Miscellaneous" or "General" — every keyword must have a meaningful category
- Be consistent: same concept = same category name across all keywords${categoryHint}
- Return ONLY a valid JSON object: { "keyword": "Category name", ... }

Keywords:
${keywords.join("\n")}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data.content[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");

  return JSON.parse(jsonMatch[0]);
}

export async function POST(req: NextRequest) {
  try {
    const { keywords } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not set — add it to your .env.local" },
        { status: 503 }
      );
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ categories: {} });
    }

    const categories: Record<string, string> = {};
    let knownCategories: string[] = [];

    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      const result = await categorizeBatch(batch, apiKey, knownCategories);
      Object.assign(categories, result);
      knownCategories = [...new Set([...knownCategories, ...Object.values(result)])];
    }

    return NextResponse.json({ categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
