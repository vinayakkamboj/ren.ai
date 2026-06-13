/**
 * Live Nutrient docs fetcher.
 *
 * Fetches llms.txt indexes from nutrient.io at query time so the Deep pipeline
 * always has current API reference instead of only the static embedded context.
 * Falls back gracefully (returns null) if fetches time out or fail.
 */

// The three primary agent-index files; order = injection priority.
const PRIMARY_LLMS_URLS = [
  "https://www.nutrient.io/llms.txt",
  "https://www.nutrient.io/guides/web/llms.txt",
  "https://www.nutrient.io/api/web/llms.txt",
] as const;

// Cap per source to avoid bloating the context window.
const MAX_CHARS_PER_SOURCE = 10_000;
const FETCH_TIMEOUT_MS = 5_000;

interface FetchedSource {
  url: string;
  content: string;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, MAX_CHARS_PER_SOURCE);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface LiveDocsResult {
  context: string;
  sources: string[];
  failed: string[];
}

/**
 * Fetch the primary Nutrient llms.txt files and return combined context.
 * Returns null if ALL fetches fail (caller falls back to static context).
 */
export async function fetchNutrientLiveDocs(): Promise<LiveDocsResult | null> {
  const results = await Promise.allSettled(
    PRIMARY_LLMS_URLS.map(async (url): Promise<FetchedSource | null> => {
      const content = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      return content ? { url, content } : null;
    })
  );

  const fetched: FetchedSource[] = [];
  const failed: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const url = PRIMARY_LLMS_URLS[i];
    if (r.status === "fulfilled" && r.value) {
      fetched.push(r.value);
    } else {
      failed.push(url);
    }
  }

  if (fetched.length === 0) return null;

  const sections = fetched.map(
    ({ url, content }) =>
      `### Live: ${url}\n\`\`\`\n${content}\n\`\`\``
  );

  const context = [
    "## LIVE NUTRIENT DOCS — fetched from nutrient.io at request time",
    "The following content was fetched live from Nutrient's llms.txt indexes.",
    "Use this as the authoritative, version-current source for any API you are uncertain about.",
    "",
    ...sections,
  ].join("\n");

  return {
    context,
    sources: fetched.map((f) => f.url),
    failed,
  };
}
