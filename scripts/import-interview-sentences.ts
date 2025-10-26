/*
  Script: Import interview questions as sentences from a web page
  Default URL: Google Cloud Skills Boost Interview Warmup (IT Support - All Questions)

  Usage examples:
    pnpm tsx scripts/import-interview-sentences.ts
    pnpm tsx scripts/import-interview-sentences.ts --url=https://example.com --userId=1

  Notes:
    - Requires DATABASE_URL to be set in environment.
    - If userId is not provided via --userId or SEED_USER_ID, defaults to 1.
    - Category name defaults to "面试"; created if not exists.
    - Difficulty defaults to "easy".
    - chineseText is stored as null.
*/

import 'dotenv/config';
import { load } from 'cheerio';

type CliArgs = {
  url?: string;
  userId?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  apiBase?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (const item of argv.slice(2)) {
    const [k, v] = item.split('=');
    if (!k) continue;
    if (k === '--url') args.url = v;
    if (k === '--userId') args.userId = Number(v);
    if (k === '--category') args.category = v as string;
    if (k === '--difficulty') args.difficulty = v as any;
    if (k === '--apiBase') args.apiBase = v as string;
  }
  return args;
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractQuestions(html: string): string[] {
  const $ = load(html);

  // Heuristic selectors: try structured selectors first, fall back to generic text blocks
  const selectors = [
    '[data-qa*="question"]',
    '[class*="question"]',
    'li',
    'h1, h2, h3, h4',
    'p',
  ];

  const collected = new Set<string>();

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = normalizeText($(el).text());
      if (!text) return;
      // Filter: reasonable length, ends with punctuation typical for questions or statements
      if (text.length < 8) return;
      // Remove UI noise
      if (/^Cookies|^Sign in|^登录|^导航|^Language/i.test(text)) return;
      collected.add(text);
    });
  }

  // Additional cleanup: remove lines that are pure duplicates with/without trailing punctuation
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const t of collected) {
    const key = t.replace(/[\s\p{P}\p{S}]+/gu, ' ').toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
  }

  return unique;
}

async function ensureCategoryViaApi(apiBase: string, cookie: string, name: string) {
  // Try GET all, then find by name
  try {
    const getRes = await fetch(`${apiBase}/api/categories`, {
      headers: { Cookie: cookie },
    });
    if (getRes.ok) {
      const data = await getRes.json();
      const payload = Array.isArray(data) ? { categories: data } : data;
      const found = payload?.categories?.find((c: any) => c?.name === name);
      if (found) return found;
    }
  } catch (e) {
    // ignore and try create
  }

  // Create if not found
  const createRes = await fetch(`${apiBase}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ name, description: '', color: '#22c55e' }),
  });
  if (!createRes.ok) {
    const err = await safeJson(createRes);
    throw new Error(`Create category failed: ${createRes.status} ${createRes.statusText} ${err?.error || ''}`);
  }
  const created = await createRes.json();
  return created.category || created;
}

async function insertSentencesViaApi(
  apiBase: string,
  cookie: string,
  categoryId: number,
  englishList: string[],
  difficulty: 'easy' | 'medium' | 'hard',
) {
  let inserted = 0;
  for (const englishText of englishList) {
    const res = await fetch(`${apiBase}/api/sentences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        englishText,
        // omit or set null for chineseText
        chineseText: null,
        categoryId,
        difficulty,
        notes: null,
        isShared: false,
      }),
    });
    if (res.ok) {
      inserted += 1;
    } else {
      const err = await safeJson(res);
      // Skip duplicates or validation errors silently; log others
      if (res.status !== 400) {
        console.warn(`Insert failed (${res.status}): ${err?.error || res.statusText}`);
      }
    }
    // small delay to avoid hitting rate limits and allow TTS queueing
    await delay(150);
  }
  return inserted;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const url =
    args.url ||
    'https://www.cloudskillsboost.google/interview_warmup/category/it-support/all-questions';
  const categoryName = args.category || '面试';
  const difficulty = args.difficulty || 'easy';
  const apiBase = args.apiBase || process.env.API_BASE_URL || 'http://localhost:3000';
  const cookie = process.env.IMPORT_SESSION_COOKIE || '';

  if (!cookie) {
    throw new Error('Missing IMPORT_SESSION_COOKIE. Please provide a valid NextAuth session cookie.');
  }

  console.log(`Fetching: ${url}`);
  const html = await fetchHtml(url);
  const questions = extractQuestions(html);

  if (questions.length === 0) {
    console.warn('No sentences extracted. Check the page structure or update selectors.');
    return;
  }

  console.log(`Extracted ${questions.length} items. Ensuring category via API...`);
  const category = await ensureCategoryViaApi(apiBase, cookie, categoryName);

  console.log(`Inserting via API (category: ${category.name}, id=${category.id}, difficulty: ${difficulty})...`);
  const count = await insertSentencesViaApi(apiBase, cookie, Number(category.id), questions, difficulty);
  console.log(`Done. Inserted ${count} new sentences via API.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


