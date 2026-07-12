// 카카오 선물하기 건강 카테고리 랭킹 수집기 (GitHub Actions용, 의존성 없음)
// - 랭킹 상위 300위 × 3카테고리 + 관심 브랜드 전 상품 위시 수를 docs/data/ 에 JSONL로 누적
// - 대시보드(GitHub Pages)가 바로 읽을 수 있게 docs/data/latest.json 을 미리 계산해 저장
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'docs', 'data');

// ── 설정 ──────────────────────────────────────────────
const TARGETS = [
  { key: 'health-all',  label: '건강 전체',       navId: 8 },
  { key: 'supplements', label: '건강식품·영양제', navId: 8, subNavId: 204 },
  { key: 'ginseng',     label: '홍삼·즙·환',      navId: 8, subNavId: 374 },
];
const WATCH_BRANDS = [
  '네추럴라이즈',
  '비마스터',
  '퓨어마스터',
  '노티드(건강)',
  '닥터브라이언',
  '엔젯오리진',
  '허벌랜드',
  '메디트리',
];
const PAGE_SIZE = 100;
const PAGES = 3;            // 상위 300위
const SERIES_DAYS = 7;      // 차트 시계열 범위
const SERIES_TOP = 30;
const MAX_POINTS = 240;
// ──────────────────────────────────────────────────────

const API_URL = 'https://gift.kakao.com/a/rank/v1/gift-rank/ranking-tab/category-tab/search';
const SEARCH_URL = 'https://gift.kakao.com/a/gift-explorer/v1/search/products';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Referer': 'https://gift.kakao.com/ranking',
  'Origin': 'https://gift.kakao.com',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kstDate = (d = new Date()) => d.toLocaleDateString('sv', { timeZone: 'Asia/Seoul' });
const log = (...a) => console.log(new Date().toISOString(), ...a);

function slim(p, i) {
  return {
    rank: i + 1,
    id: p.productId,
    name: p.name,
    brand: p.brand?.name ?? '',
    price: p.price?.sellingPrice ?? null,
    wish: p.wish?.wishCount ?? null,
    review: p.review?.reviewCount ?? null,
    order: p.fomoBadge?.orderCount ?? null,
  };
}

async function fetchRanking(target) {
  const products = [];
  let updatedAt = null;
  for (let page = 0; page < PAGES; page++) {
    const body = { navId: target.navId, page, size: PAGE_SIZE };
    if (target.subNavId) body.subNavId = target.subNavId;
    const res = await fetch(API_URL, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    updatedAt = json.updatedAt ?? updatedAt;
    products.push(...(json.products ?? []).map((p, i) => slim(p, page * PAGE_SIZE + i)));
    if (json.last) break;
    await sleep(1500 + Math.random() * 1500);
  }
  return { ts: new Date().toISOString(), updatedAt, products };
}

async function fetchBrandProducts(brandName) {
  const url = `${SEARCH_URL}?query=${encodeURIComponent(brandName)}&page=0&size=50`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.products?.contents ?? [])
    .filter((p) => p.brand?.name === brandName)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price?.sellingPrice ?? null,
      wish: p.wish?.wishCount ?? null,
      review: p.review?.reviewCount ?? null,
    }));
}

// ── 저장 파일 읽기 ────────────────────────────────────
function listDays(key) {
  try {
    return readdirSync(join(DATA_DIR, key))
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => f.replace('.jsonl', ''))
      .sort();
  } catch { return []; }
}

function readDay(key, date) {
  try {
    return readFileSync(join(DATA_DIR, key, `${date}.jsonl`), 'utf8')
      .split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

function loadRecent(key, days = 2) {
  return listDays(key).slice(-days)
    .flatMap((d) => readDay(key, d))
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

function closestSnap(snaps, goalMs, tolMs) {
  let best = null, bestDiff = tolMs;
  for (const s of snaps) {
    const diff = Math.abs(new Date(s.ts).getTime() - goalMs);
    if (diff < bestDiff) { bestDiff = diff; best = s; }
  }
  return best;
}

// ── latest.json 계산 (대시보드가 이 파일 하나만 읽으면 됨) ──
function buildTable(key) {
  const snaps = loadRecent(key);
  if (!snaps.length) return { times: [], snap: null, prev: null, base24: null };
  const snap = snaps[snaps.length - 1];
  return {
    times: snaps.map((s) => s.ts),
    snap,
    prev: snaps.length > 1 ? snaps[snaps.length - 2] : null,
    base24: closestSnap(snaps, new Date(snap.ts).getTime() - 24 * 3600e3, 3 * 3600e3),
  };
}

function buildSeries(key) {
  const dates = listDays(key).slice(-SERIES_DAYS);
  const snaps = dates.flatMap((d) => readDay(key, d)).sort((a, b) => a.ts.localeCompare(b.ts));
  if (!snaps.length) return { times: [], products: [] };
  let sel = snaps;
  if (snaps.length > MAX_POINTS) {
    const stride = (snaps.length - 1) / (MAX_POINTS - 1);
    sel = Array.from({ length: MAX_POINTS }, (_, k) => snaps[Math.round(k * stride)]);
  }
  const maps = sel.map((s) => new Map(s.products.map((p) => [p.id, p])));
  const latest = snaps[snaps.length - 1];
  return {
    times: sel.map((s) => s.ts),
    products: latest.products.slice(0, SERIES_TOP).map((lp) => ({
      id: lp.id, name: lp.name, brand: lp.brand, price: lp.price,
      ranks: maps.map((m) => m.get(lp.id)?.rank ?? null),
      wishes: maps.map((m) => m.get(lp.id)?.wish ?? null),
    })),
  };
}

function buildWatch() {
  const wsnaps = loadRecent('watch');
  if (!wsnaps.length) return { error: 'no-data' };
  const latest = wsnaps[wsnaps.length - 1];
  const day = closestSnap(wsnaps, new Date(latest.ts).getTime() - 24 * 3600e3, 3 * 3600e3);

  const rankMap = new Map();
  for (const t of TARGETS) {
    const snaps = loadRecent(t.key);
    const s = snaps[snaps.length - 1];
    if (!s) continue;
    for (const p of s.products) {
      const cur = rankMap.get(p.id);
      if (!cur || p.rank < cur.rank) rankMap.set(p.id, { rank: p.rank, target: t.label });
    }
  }
  const sup = loadRecent('supplements');
  const supLatest = sup[sup.length - 1];
  const thresholds = supLatest ? {
    r100: supLatest.products[99]?.wish ?? null,
    last: supLatest.products[supLatest.products.length - 1]?.wish ?? null,
    lastRank: supLatest.products.length,
  } : null;

  const brands = Object.entries(latest.brands).map(([name, products]) => {
    const in24 = (id) => day?.brands?.[name]?.find((q) => q.id === id);
    const rows = products.map((p) => {
      const r = rankMap.get(p.id);
      return { ...p, rank: r?.rank ?? null, rankTarget: r?.target ?? null, wish24: in24(p.id)?.wish ?? null };
    }).sort((a, b) => (b.wish ?? 0) - (a.wish ?? 0));
    const ranked = rows.filter((r) => r.rank != null);
    const best = ranked.length ? ranked.reduce((a, b) => (a.rank < b.rank ? a : b)) : null;
    return {
      name,
      main: name === WATCH_BRANDS[0],
      productCount: rows.length,
      totalWish: rows.reduce((s, p) => s + (p.wish ?? 0), 0),
      wishDelta24: day ? rows.reduce((s, p) => s + ((p.wish != null && p.wish24 != null) ? p.wish - p.wish24 : 0), 0) : null,
      rankedCount: ranked.length,
      bestRank: best?.rank ?? null,
      bestRankTarget: best?.rankTarget ?? null,
      products: rows,
    };
  });
  return { ts: latest.ts, compared24: day?.ts ?? null, thresholds, brands };
}

// ── 메인 ─────────────────────────────────────────────
async function main() {
  // 정시 크론 티가 나지 않게 0~4분 랜덤 지연 (수동 실행 시 RUN_NOW=1 로 생략)
  if (!process.env.RUN_NOW) {
    const jitter = Math.random() * 240e3;
    log(`랜덤 지연 ${(jitter / 1000).toFixed(0)}초`);
    await sleep(jitter);
  }

  for (const target of TARGETS) {
    const snap = await fetchRanking(target);
    const dir = join(DATA_DIR, target.key);
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, `${kstDate()}.jsonl`), JSON.stringify(snap) + '\n');
    log(`[${target.label}] ${snap.products.length}개 저장 (서버 갱신: ${snap.updatedAt})`);
    await sleep(2000 + Math.random() * 3000);
  }

  const brands = {};
  for (const b of WATCH_BRANDS) {
    try { brands[b] = await fetchBrandProducts(b); }
    catch (e) { log(`[관심브랜드 ${b}] 실패:`, e.message); }
    await sleep(1000 + Math.random() * 2000);
  }
  const wdir = join(DATA_DIR, 'watch');
  mkdirSync(wdir, { recursive: true });
  appendFileSync(join(wdir, `${kstDate()}.jsonl`), JSON.stringify({ ts: new Date().toISOString(), brands }) + '\n');
  log(`[관심 브랜드] ${Object.keys(brands).length}개 저장`);

  const latest = {
    generatedAt: new Date().toISOString(),
    targets: TARGETS.map(({ key, label }) => ({ key, label })),
    table: Object.fromEntries(TARGETS.map((t) => [t.key, buildTable(t.key)])),
    series: Object.fromEntries(TARGETS.map((t) => [t.key, buildSeries(t.key)])),
    watch: buildWatch(),
    days: Object.fromEntries([...TARGETS.map((t) => t.key), 'watch'].map((k) => [k, listDays(k)])),
  };
  writeFileSync(join(DATA_DIR, 'latest.json'), JSON.stringify(latest));
  log('latest.json 갱신 완료');
}

main().catch((e) => { console.error(e); process.exit(1); });
