/* 무한 크로스워드 — 아래로 계속 이어지고, 다 푼 윗부분은 걷어내며 올라붙는 낱말 퍼즐 */
(() => {
'use strict';

/* ───────── 한글 조합기 ───────── */
const CHO  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const VOWEL_PAIR = {'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ','ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ','ㅡㅣ':'ㅢ'};
const JONG_PAIR  = {'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
const JONG_SPLIT = Object.fromEntries(Object.entries(JONG_PAIR).map(([k, v]) => [v, [k[0], k[1]]]));
const isVowel = j => JUNG.includes(j);

/** 조합 상태 → 화면에 보일 글자 */
function assemble(s) {
  if (!s.cho && !s.jung) return '';
  if (!s.cho) return s.jung;
  if (!s.jung) return s.cho;
  const code = 0xac00 + (CHO.indexOf(s.cho) * 21 + JUNG.indexOf(s.jung)) * 28 + JONG.indexOf(s.jong || '');
  return String.fromCharCode(code);
}
const isFull = s => !!(s.cho && s.jung);

/**
 * 자모 하나를 넣는다.
 * @returns {{done?:string, cur:object}} done 이 있으면 그 글자를 확정하고 다음 칸으로 넘어간다.
 */
function feed(s, j) {
  const cur = { cho: s.cho || '', jung: s.jung || '', jong: s.jong || '' };
  if (isVowel(j)) {
    if (!cur.jung) { cur.jung = j; return { cur }; }               // ㄱ + ㅏ
    if (!cur.cho)  { return { cur: { cho: '', jung: j, jong: '' } }; }
    if (!cur.jong) {                                                // 가 + ㅣ → 개? (ㅏㅣ 는 미조합) / 고 + ㅏ → 과
      const pair = VOWEL_PAIR[cur.jung + j];
      if (pair) { cur.jung = pair; return { cur }; }
      return { done: assemble(cur), cur: { cho: '', jung: j, jong: '' } };
    }
    // 각 + ㅏ → 가 + 가  (받침이 다음 글자의 초성으로 넘어감)
    const sp = JONG_SPLIT[cur.jong];
    const moved = sp ? sp[1] : cur.jong;
    const kept  = sp ? sp[0] : '';
    const done = assemble({ cho: cur.cho, jung: cur.jung, jong: kept });
    return { done, cur: { cho: CHO.includes(moved) ? moved : '', jung: j, jong: '' } };
  }
  // 자음
  if (!cur.cho && !cur.jung) return { cur: { cho: j, jung: '', jong: '' } };
  if (!cur.jung) return { cur: { cho: j, jung: '', jong: '' } };   // 미완성은 버리고 새로 시작
  if (!cur.cho)  return { cur: { cho: j, jung: '', jong: '' } };
  if (!cur.jong) {
    if (JONG.includes(j)) { cur.jong = j; return { cur }; }
    return { done: assemble(cur), cur: { cho: j, jung: '', jong: '' } };
  }
  const pair = JONG_PAIR[cur.jong + j];
  if (pair) { cur.jong = pair; return { cur }; }
  return { done: assemble(cur), cur: { cho: j, jung: '', jong: '' } };
}

/** 조합 상태에서 자모 하나 지우기 */
function unfeed(s) {
  const cur = { cho: s.cho || '', jung: s.jung || '', jong: s.jong || '' };
  if (cur.jong) {
    const sp = JONG_SPLIT[cur.jong];
    cur.jong = sp ? sp[0] : '';
  } else if (cur.jung) {
    const pair = Object.entries(VOWEL_PAIR).find(([, v]) => v === cur.jung);
    cur.jung = pair ? pair[0][0] : '';
  } else if (cur.cho) {
    cur.cho = '';
  } else return null;
  return cur;
}

/** 완성된 음절을 조합 상태로 되돌린다 (칸을 이어서 고칠 때) */
function disassemble(ch) {
  if (!ch) return { cho: '', jung: '', jong: '' };
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) {
    if (CHO.includes(ch)) return { cho: ch, jung: '', jong: '' };
    if (isVowel(ch)) return { cho: '', jung: ch, jong: '' };
    return { cho: '', jung: '', jong: '' };
  }
  return { cho: CHO[Math.floor(code / 588)], jung: JUNG[Math.floor(code / 28) % 21], jong: JONG[code % 28] };
}

/* ───────── 격자 ───────── */
const W = 8;                 // 열 수
const AHEAD = 26;            // 화면 아래로 미리 만들어 두는 줄 수
const MAX_SEAM_GAP = 8;      // 이 줄 수보다 길게 "걷어낼 수 없는 구간" 이 이어지지 않게
const key = (x, y) => x + ',' + y;

const BANK = window.WORD_BANK;
const INDEX = new Map();     // 음절 → [{wi, pos}]
BANK.forEach(([w], wi) => {
  [...w].forEach((c, pos) => {
    if (!INDEX.has(c)) INDEX.set(c, []);
    INDEX.get(c).push({ wi, pos });
  });
});
const pick = a => a[(Math.random() * a.length) | 0];

const G = {
  cells: new Map(),   // "x,y" → {x,y,ans,ch,solved,across,down,num}
  words: new Map(),   // id → {id,word,clue,x,y,dir,len,solved}
  nextId: 1,
  maxY: -1,
  filledTo: 0,        // 이 줄까지는 촘촘하게 채워 둠
  depth: 0,           // 걷어낸 줄 수
  solvedCount: 0,
  score: 0,
  hints: 0,
  recent: [],         // 최근에 쓴 단어 (근처 중복 방지)
};

function fits(word, x, y, dir, needCross) {
  const len = word.length;
  if (x < 0 || y < 0) return -1;
  if (dir === 'A' ? x + len > W : x >= W) return -1;
  const before = dir === 'A' ? key(x - 1, y) : key(x, y - 1);
  const after  = dir === 'A' ? key(x + len, y) : key(x, y + len);
  if (G.cells.has(before) || G.cells.has(after)) return -1;
  let cross = 0;
  for (let i = 0; i < len; i++) {
    const cx = dir === 'A' ? x + i : x, cy = dir === 'A' ? y : y + i;
    const c = G.cells.get(key(cx, cy));
    if (c) {
      if (c.ans !== word[i]) return -1;
      if (dir === 'A' ? c.across !== null : c.down !== null) return -1;
      cross++;
    } else if (dir === 'A') {
      if (G.cells.has(key(cx, cy - 1)) || G.cells.has(key(cx, cy + 1))) return -1;
    } else {
      if (G.cells.has(key(cx - 1, cy)) || G.cells.has(key(cx + 1, cy))) return -1;
    }
  }
  if (needCross && cross === 0) return -1;
  return cross;
}

function place(wi, x, y, dir) {
  const [word, clue] = BANK[wi];
  const id = G.nextId++;
  const w = { id, word, clue, x, y, dir, len: word.length, solved: false };
  G.words.set(id, w);
  for (let i = 0; i < word.length; i++) {
    const cx = dir === 'A' ? x + i : x, cy = dir === 'A' ? y : y + i;
    const k = key(cx, cy);
    let c = G.cells.get(k);
    if (!c) { c = { x: cx, y: cy, ans: word[i], ch: '', solved: false, across: null, down: null, num: 0 }; G.cells.set(k, c); }
    if (dir === 'A') c.across = id; else c.down = id;
    if (cy > G.maxY) G.maxY = cy;
  }
  G.recent.push(word);
  if (G.recent.length > 60) G.recent.shift();
  return w;
}

/** 세로 단어가 y 줄을 가로지르는지 (줄을 걷어낼 수 있는 자리인지) */
function straddleRun(extra) {
  const st = new Set(extra || []);
  for (const w of G.words.values())
    if (w.dir === 'D') for (let y = w.y + 1; y < w.y + w.len; y++) st.add(y);
  let run = 0, worst = 0;
  for (let y = 1; y <= G.maxY; y++) { if (st.has(y)) { run++; worst = Math.max(worst, run); } else run = 0; }
  return worst;
}

/** 세로 단어를 놓으면 "걷어낼 수 있는 줄" 이 너무 뜸해지는지 */
function breaksSeam(y, len) {
  if (len < 2) return false;
  const rows = [];
  for (let r = y + 1; r < y + len; r++) rows.push(r);
  return straddleRun(rows) > MAX_SEAM_GAP;
}

/** 한 자리 시도: 성공하면 true */
function tryOne(band, upTo) {
  const anchor = pick(band);
  if (!anchor) return false;
  const cands = INDEX.get(anchor.ans);
  if (!cands) return false;
  const { wi, pos } = pick(cands);
  const [word] = BANK[wi];
  if (G.recent.includes(word)) return false;
  const dir = anchor.across === null ? 'A' : (anchor.down === null ? 'D' : null);
  if (!dir) return false;
  const x = dir === 'A' ? anchor.x - pos : anchor.x;
  const y = dir === 'A' ? anchor.y : anchor.y - pos;
  if (upTo !== undefined && (dir === 'D' ? y + word.length - 1 : y) > upTo) return false;
  if (fits(word, x, y, dir, true) < 0) return false;
  if (dir === 'D' && breaksSeam(y, word.length)) return false;
  place(wi, x, y, dir);
  return true;
}

/** 빈 곳에 새 씨앗 심기 — 가장 허전한 줄을 골라 심는다 */
function trySeed(minY, maxYAllowed) {
  const count = new Map();
  for (let y = minY; y <= maxYAllowed; y++) count.set(y, 0);
  for (const c of G.cells.values()) if (count.has(c.y)) count.set(c.y, count.get(c.y) + 1);
  const rows = [...count.entries()].sort((a, b) => a[1] - b[1]).slice(0, 6).map(e => e[0]);
  if (!rows.length) return false;
  for (let t = 0; t < 80; t++) {
    const wi = (Math.random() * BANK.length) | 0;
    const [word] = BANK[wi];
    if (G.recent.includes(word)) continue;
    const dir = Math.random() < 0.8 ? 'A' : 'D';
    const y = pick(rows);
    if (dir === 'D' && y + word.length - 1 > maxYAllowed) continue;
    const x = dir === 'A' ? ((Math.random() * (W - word.length + 1)) | 0) : ((Math.random() * W) | 0);
    if (fits(word, x, y, dir, false) < 0) continue;
    if (dir === 'D' && breaksSeam(y, word.length)) continue;
    place(wi, x, y, dir);
    return true;
  }
  return false;
}

/** targetY 줄까지 만들고, 그 위쪽을 촘촘하게 메운다 */
function grow(targetY) {
  if (G.cells.size === 0) {
    const wi = BANK.findIndex(([w]) => w.length === 3);
    place(wi < 0 ? 0 : wi, 2, 0, 'A');
  }
  // 1) 아래로 뻗기
  let stall = 0;
  while (G.maxY < targetY && stall < 300) {
    const band = [];
    for (const c of G.cells.values()) if (c.y > G.maxY - 12 && (c.across === null || c.down === null)) band.push(c);
    let ok = false;
    for (let t = 0; t < 120 && !ok; t++) ok = tryOne(band);
    if (ok) { stall = 0; continue; }
    stall++;
    if (trySeed(G.maxY + 1, G.maxY + 2)) stall = 0;
  }
  // 2) 아직 안 메운 구간을 촘촘하게
  const from = Math.max(0, G.filledTo - 10);
  const upTo = Math.min(targetY, G.maxY);
  const span = Math.max(1, upTo - from + 1);
  const tries = Math.min(20000, Math.max(300, span * 40));   // 넓은 구간일수록 더 오래 채운다
  const cap = Math.max(15, span);
  let idle = 0;
  while (idle < 5) {
    // 아직 한쪽 방향이 비어 있는 칸만 발판으로 삼는다
    const band = [];
    for (const c of G.cells.values())
      if (c.y >= from && c.y <= upTo && (c.across === null || c.down === null)) band.push(c);
    if (!band.length) break;
    let placed = 0;
    for (let t = 0; t < tries && placed < cap; t++) if (tryOne(band, upTo)) placed++;
    if (placed) { idle = 0; continue; }
    idle++;
    if (idle === 2 || idle === 4) trySeed(from, upTo);   // 허전한 줄에만 씨앗
  }
  G.filledTo = Math.max(G.filledTo, upTo);
  number();
}

/** 화면 순서대로 단어 번호 매기기 */
function number() {
  const starts = [...G.cells.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  let n = 0;
  for (const c of starts) {
    const a = c.across !== null && G.words.get(c.across).x === c.x && G.words.get(c.across).y === c.y;
    const d = c.down !== null && G.words.get(c.down).x === c.x && G.words.get(c.down).y === c.y;
    c.num = (a || d) ? ++n : 0;
    if (a) G.words.get(c.across).num = c.num;
    if (d) G.words.get(c.down).num = c.num;
  }
}

const wordCells = w => Array.from({ length: w.len }, (_, i) =>
  G.cells.get(key(w.dir === 'A' ? w.x + i : w.x, w.dir === 'A' ? w.y : w.y + i)));

/* ───────── 상태·판정 ───────── */
const S = { cur: null, dir: 'A', comp: { cho: '', jung: '', jong: '' } };

function checkWords(cell) {
  let gained = 0;
  for (const id of [cell.across, cell.down]) {
    if (id === null) continue;
    const w = G.words.get(id);
    if (w.solved) continue;
    const cs = wordCells(w);
    if (cs.every(c => c.ch === c.ans)) {
      w.solved = true;
      cs.forEach(c => { c.solved = true; });
      G.solvedCount++;
      gained += 10 + w.len * 2;
    }
  }
  if (gained) { G.score += gained; flash(gained); }
  return gained;
}

/** 위에서부터 통째로 풀린 줄 수 (단어가 걸쳐 있지 않은 지점까지) */
function clearableY() {
  let limit = 0;
  for (let y = 0; y <= G.maxY; y++) {
    let ok = true;
    for (let x = 0; x < W; x++) {
      const c = G.cells.get(key(x, y));
      if (c && c.ch !== c.ans) { ok = false; break; }
    }
    if (!ok) break;
    limit = y + 1;
  }
  if (!limit) return 0;
  let best = 0;
  for (let y = 1; y <= limit; y++) {
    let straddle = false;
    for (const w of G.words.values()) {
      if (w.dir === 'D' && w.y < y && w.y + w.len > y) { straddle = true; break; }
    }
    if (!straddle) best = y;
  }
  return best;
}

function collapse() {
  const n = clearableY();
  if (!n) return false;
  for (const [k, c] of [...G.cells]) if (c.y < n) G.cells.delete(k);
  for (const [id, w] of [...G.words]) if (w.y + (w.dir === 'D' ? w.len - 1 : 0) < n) G.words.delete(id);
  const moved = new Map();
  for (const c of G.cells.values()) { c.y -= n; moved.set(key(c.x, c.y), c); }
  G.cells = moved;
  for (const w of G.words.values()) w.y -= n;
  G.maxY -= n;
  G.filledTo = Math.max(0, G.filledTo - n);
  G.depth += n;
  G.score += n * 5;
  if (S.cur) {
    const [x, y] = S.cur.split(',').map(Number);
    const nk = key(x, y - n);
    S.cur = (y >= n && G.cells.has(nk)) ? nk : null;
  }
  number();
  return true;
}

/* ───────── 화면 ───────── */
const board = document.getElementById('board');
const layer = document.getElementById('layer');
const scroller = document.getElementById('scroller');
const els = new Map();       // 칸 객체 → div (좌표가 아니라 객체로 묶어야 줄이 걷혀도 안 어긋난다)
let C = 44;                  // 칸 크기(px)

function sizeCells() {
  const avail = Math.min(scroller.clientWidth - 16, 460);
  C = Math.max(30, Math.floor(avail / W));
  document.documentElement.style.setProperty('--c', C + 'px');
}

function vanish(cell) {
  const el = els.get(cell);
  if (!el) return;
  els.delete(cell);
  el.classList.add('gone');
  setTimeout(() => el.remove(), 400);
}

function render() {
  layer.style.height = (G.maxY + 2) * C + 'px';
  const w = curWord();
  const inWord = w ? new Set(wordCells(w)) : null;
  const live = new Set();
  for (const [k, c] of G.cells) {
    live.add(c);
    let el = els.get(c);
    if (!el) {
      el = document.createElement('div');
      el.className = 'cell';
      el.innerHTML = '<b></b><i></i>';
      el._b = el.firstChild; el._i = el.lastChild;
      el.addEventListener('pointerdown', e => { e.preventDefault(); tap(key(c.x, c.y)); });
      layer.appendChild(el);
      els.set(c, el);
      el.style.transform = `translate(${c.x * C}px, ${c.y * C}px)`;
      el.classList.add('born');
      requestAnimationFrame(() => el.classList.remove('born'));
    }
    const txt = c.ch || '', num = c.num ? String(c.num) : '';
    if (el._b.textContent !== txt) el._b.textContent = txt;
    if (el._i.textContent !== num) el._i.textContent = num;
    const tf = `translate(${c.x * C}px, ${c.y * C}px)`;
    if (el._tf !== tf) { el.style.transform = tf; el._tf = tf; }
    el.classList.toggle('solved', c.solved);
    el.classList.toggle('cur', k === S.cur);
    el.classList.toggle('inword', !!inWord && inWord.has(c));
  }
  for (const c of [...els.keys()]) if (!live.has(c)) vanish(c);
  document.getElementById('depth').textContent = G.depth;
  document.getElementById('solved').textContent = G.solvedCount;
  document.getElementById('score').textContent = G.score;
  renderClue();
  renderList();
}

function curWord() {
  if (!S.cur) return null;
  const c = G.cells.get(S.cur);
  if (!c) return null;
  const id = S.dir === 'A' ? c.across : c.down;
  if (id !== null) return G.words.get(id);
  const alt = S.dir === 'A' ? c.down : c.across;
  return alt !== null ? G.words.get(alt) : null;
}

function renderClue() {
  const w = curWord();
  const bar = document.getElementById('clue');
  if (!w) { bar.innerHTML = '<span class="ph">칸을 눌러 시작하세요</span>'; return; }
  bar.innerHTML = `<span class="tag ${w.dir === 'A' ? 'a' : 'd'}">${w.num} ${w.dir === 'A' ? '가로' : '세로'}</span>` +
                  `<span class="txt">${w.clue}</span><span class="len">${w.len}글자</span>`;
}

function renderList() {
  const box = document.getElementById('list');
  if (!box.offsetParent) return;
  const from = Math.floor(scroller.scrollTop / C) - 2;
  const to = Math.ceil((scroller.scrollTop + scroller.clientHeight) / C) + 2;
  const ws = [...G.words.values()]
    .filter(w => w.y + (w.dir === 'D' ? w.len - 1 : 0) >= from && w.y <= to)
    .sort((a, b) => a.num - b.num);
  const row = w => `<li class="${w.solved ? 'ok' : ''} ${curWord() === w ? 'on' : ''}" data-id="${w.id}">` +
    `<b>${w.num}</b><span>${w.clue}</span></li>`;
  box.innerHTML =
    `<h3>가로</h3><ul>${ws.filter(w => w.dir === 'A').map(row).join('')}</ul>` +
    `<h3>세로</h3><ul>${ws.filter(w => w.dir === 'D').map(row).join('')}</ul>`;
}

document.getElementById('list').addEventListener('click', e => {
  const li = e.target.closest('li');
  if (!li) return;
  const w = G.words.get(+li.dataset.id);
  if (!w) return;
  S.dir = w.dir;
  const cs = wordCells(w);
  S.cur = key((cs.find(c => !c.solved) || cs[0]).x, (cs.find(c => !c.solved) || cs[0]).y);
  S.comp = disassemble(G.cells.get(S.cur).ch);
  scrollTo(G.cells.get(S.cur));
  render();
});

let flashT;
function flash(v) {
  const el = document.getElementById('flash');
  el.textContent = typeof v === 'number' ? '+' + v : v;
  el.classList.add('on');
  clearTimeout(flashT);
  flashT = setTimeout(() => el.classList.remove('on'), 700);
}

function scrollTo(c) {
  const top = c.y * C, bot = top + C;
  const vt = scroller.scrollTop, vb = vt + scroller.clientHeight;
  if (top < vt + C) scroller.scrollTo({ top: Math.max(0, top - C * 2), behavior: 'smooth' });
  else if (bot > vb - C) scroller.scrollTo({ top: bot - scroller.clientHeight + C * 2, behavior: 'smooth' });
}

/* ───────── 조작 ───────── */
function tap(k) {
  const c = G.cells.get(k);
  if (!c) return;
  if (S.cur === k) {
    const other = S.dir === 'A' ? 'D' : 'A';
    if ((other === 'A' ? c.across : c.down) !== null) S.dir = other;
  } else {
    S.cur = k;
    if ((S.dir === 'A' ? c.across : c.down) === null) S.dir = S.dir === 'A' ? 'D' : 'A';
  }
  S.comp = disassemble(c.ch);
  render();
}

function advance() {
  const w = curWord();
  if (!w) return;
  const cs = wordCells(w);
  const i = cs.findIndex(c => key(c.x, c.y) === S.cur);
  for (let j = i + 1; j < cs.length; j++) {
    if (!cs[j].solved) { S.cur = key(cs[j].x, cs[j].y); S.comp = disassemble(cs[j].ch); return; }
  }
  const next = cs[i + 1];
  if (next) { S.cur = key(next.x, next.y); S.comp = disassemble(next.ch); }
}

function retreat() {
  const w = curWord();
  if (!w) return false;
  const cs = wordCells(w);
  const i = cs.findIndex(c => key(c.x, c.y) === S.cur);
  if (i <= 0) return false;
  S.cur = key(cs[i - 1].x, cs[i - 1].y);
  S.comp = disassemble(cs[i - 1].ch);
  return true;
}

function input(j) {
  if (!S.cur) return;
  let c = G.cells.get(S.cur);
  if (!c) return;
  if (c.solved) { advance(); c = G.cells.get(S.cur); if (!c || c.solved) { render(); return; } }
  const r = feed(S.comp, j);
  if (r.done !== undefined) {
    c.ch = r.done;
    checkWords(c);
    advance();
    const n = G.cells.get(S.cur);
    if (n && !n.solved) { S.comp = r.cur; n.ch = assemble(r.cur); checkWords(n); }
    else S.comp = disassemble(n ? n.ch : '');
  } else {
    S.comp = r.cur;
    c.ch = assemble(r.cur);
    checkWords(c);
  }
  after();
}

function backspace() {
  if (!S.cur) return;
  const c = G.cells.get(S.cur);
  if (!c) return;
  if (!c.solved) {
    const u = unfeed(S.comp);
    if (u && (u.cho || u.jung)) { S.comp = u; c.ch = assemble(u); render(); return; }
    if (c.ch) { c.ch = ''; S.comp = { cho: '', jung: '', jong: '' }; render(); return; }
  }
  if (retreat()) {
    const p = G.cells.get(S.cur);
    if (p && !p.solved) { p.ch = ''; S.comp = { cho: '', jung: '', jong: '' }; }
  }
  render();
}

function hint() {
  if (!S.cur) return;
  const w = curWord();
  const c = G.cells.get(S.cur);
  const target = (c && !c.solved) ? c : (w ? wordCells(w).find(x => !x.solved) : null);
  if (!target) return;
  target.ch = target.ans;
  G.hints++;
  G.score = Math.max(0, G.score - 8);
  S.cur = key(target.x, target.y);
  S.comp = disassemble(target.ch);
  checkWords(target);
  advance();
  after();
}

function move(dx, dy) {
  if (!S.cur) return;
  let [x, y] = S.cur.split(',').map(Number);
  for (let i = 0; i < 30; i++) {
    x += dx; y += dy;
    if (x < 0 || x >= W || y < 0) return;
    const c = G.cells.get(key(x, y));
    if (c) { S.cur = key(x, y); S.comp = disassemble(c.ch); scrollTo(c); render(); return; }
    if (y > G.maxY) return;
  }
}

/** 지금 자리에서 가장 가까운 미해결 단어로 옮겨 간다 */
function jumpNearest() {
  const c = S.cur ? G.cells.get(S.cur) : null;
  const x0 = c ? c.x : 0, y0 = c ? c.y : 0;
  let best = null, bestD = Infinity;
  for (const w of G.words.values()) {
    if (w.solved) continue;
    const dy = w.y - y0;
    const d = (dy >= 0 ? dy : -dy * 1.6) * 2 + Math.abs(w.x - x0);
    if (d < bestD) { bestD = d; best = w; }
  }
  if (!best) return;
  S.dir = best.dir;
  const t = wordCells(best).find(x => !x.solved) || wordCells(best)[0];
  S.cur = key(t.x, t.y);
  S.comp = disassemble(t.ch);
  scrollTo(t);
}

function nextWord(step) {
  const ws = [...G.words.values()].filter(w => !w.solved).sort((a, b) => a.num - b.num || (a.dir < b.dir ? -1 : 1));
  if (!ws.length) return;
  const cw = curWord();
  let i = cw ? ws.indexOf(cw) : -1;
  i = (i + step + ws.length) % ws.length;
  const w = ws[i];
  S.dir = w.dir;
  const c = wordCells(w).find(x => !x.solved) || wordCells(w)[0];
  S.cur = key(c.x, c.y);
  S.comp = disassemble(c.ch);
  scrollTo(c);
  render();
}

/** 입력 뒤 뒷정리: 줄 걷어내기 + 아래 생성 + 저장 */
function after() {
  let cleared = 0;
  for (;;) {
    const before = G.depth;
    if (!collapse()) break;
    cleared += G.depth - before;
  }
  ensureAhead();
  if (cleared) {
    flash(cleared + '줄 정리!');
    board.classList.add('lift');
    setTimeout(() => board.classList.remove('lift'), 400);
  }
  const w = curWord();
  if (!S.cur || (w && w.solved)) jumpNearest();
  render();
  save();
}

function ensureAhead() {
  const bottomRow = Math.ceil((scroller.scrollTop + scroller.clientHeight) / C);
  if (G.maxY < bottomRow + AHEAD) grow(bottomRow + AHEAD);
}

/* ───────── 키보드 ───────── */
const ROWS = [
  ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
  ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
  ['⇧','ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ','⌫'],
];
const SHIFTED = { 'ㅂ':'ㅃ','ㅈ':'ㅉ','ㄷ':'ㄸ','ㄱ':'ㄲ','ㅅ':'ㅆ','ㅐ':'ㅒ','ㅔ':'ㅖ' };
const QWERTY = { q:'ㅂ',w:'ㅈ',e:'ㄷ',r:'ㄱ',t:'ㅅ',y:'ㅛ',u:'ㅕ',i:'ㅑ',o:'ㅐ',p:'ㅔ',
                 a:'ㅁ',s:'ㄴ',d:'ㅇ',f:'ㄹ',g:'ㅎ',h:'ㅗ',j:'ㅓ',k:'ㅏ',l:'ㅣ',
                 z:'ㅋ',x:'ㅌ',c:'ㅊ',v:'ㅍ',b:'ㅠ',n:'ㅜ',m:'ㅡ',
                 Q:'ㅃ',W:'ㅉ',E:'ㄸ',R:'ㄲ',T:'ㅆ',O:'ㅒ',P:'ㅖ' };
let shift = false;

function buildKeyboard() {
  const kb = document.getElementById('kb');
  kb.innerHTML = '';
  ROWS.forEach(row => {
    const r = document.createElement('div');
    r.className = 'krow';
    row.forEach(k => {
      const b = document.createElement('button');
      b.className = 'key' + (k === '⇧' || k === '⌫' ? ' fn' : '');
      b.dataset.k = k;
      b.textContent = k;
      r.appendChild(b);
    });
    kb.appendChild(r);
  });
  kb.addEventListener('pointerdown', e => {
    const b = e.target.closest('.key');
    if (!b) return;
    e.preventDefault();
    const k = b.dataset.k;
    if (k === '⌫') { backspace(); return; }
    if (k === '⇧') { shift = !shift; paintShift(); return; }
    input(shift ? (SHIFTED[k] || k) : k);
    if (shift) { shift = false; paintShift(); }
  });
  paintShift();
}

function paintShift() {
  document.querySelectorAll('#kb .key').forEach(b => {
    const k = b.dataset.k;
    if (k === '⇧') { b.classList.toggle('on', shift); return; }
    if (k === '⌫') return;
    b.textContent = shift ? (SHIFTED[k] || k) : k;
  });
}

window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === 'Backspace') { e.preventDefault(); backspace(); return; }
  if (k === 'Tab') { e.preventDefault(); nextWord(e.shiftKey ? -1 : 1); return; }
  if (k === 'Enter') { e.preventDefault(); nextWord(1); return; }
  if (k === ' ') { e.preventDefault(); if (S.cur) { const c = G.cells.get(S.cur); S.dir = S.dir === 'A' ? 'D' : 'A'; if ((S.dir === 'A' ? c.across : c.down) === null) S.dir = S.dir === 'A' ? 'D' : 'A'; render(); } return; }
  if (k === 'ArrowLeft')  { e.preventDefault(); move(-1, 0); return; }
  if (k === 'ArrowRight') { e.preventDefault(); move(1, 0); return; }
  if (k === 'ArrowUp')    { e.preventDefault(); move(0, -1); return; }
  if (k === 'ArrowDown')  { e.preventDefault(); move(0, 1); return; }
  if (QWERTY[k]) { e.preventDefault(); input(QWERTY[k]); return; }
  // 한글 IME 가 켜져 있어 자모/음절이 그대로 들어오는 경우
  if (k.length === 1) {
    const cc = k.charCodeAt(0);
    if (cc >= 0x3131 && cc <= 0x3163) { e.preventDefault(); input(k); return; }
    if (cc >= 0xac00 && cc <= 0xd7a3) {
      e.preventDefault();
      const d = disassemble(k);
      input(d.cho); input(d.jung); if (d.jong) input(d.jong);
    }
  }
});

/* ───────── 저장 ───────── */
const SAVE_KEY = 'infinite-crossword-v1';
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      const data = {
        depth: G.depth, score: G.score, solvedCount: G.solvedCount, hints: G.hints, filledTo: G.filledTo,
        words: [...G.words.values()].map(w => [w.word, w.clue, w.x, w.y, w.dir]),
        entries: [...G.cells.values()].filter(c => c.ch).map(c => [c.x, c.y, c.ch]),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) {}
  }, 300);
}

function load() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) { return false; }
  if (!data || !data.words || !data.words.length) return false;
  G.cells = new Map(); G.words = new Map(); G.nextId = 1; G.maxY = -1;
  for (const [word, clue, x, y, dir] of data.words) {
    const wi = BANK.findIndex(([w]) => w === word);
    if (wi < 0) continue;
    place(wi, x, y, dir);
    G.words.get(G.nextId - 1).clue = clue;
  }
  for (const [x, y, ch] of (data.entries || [])) {
    const c = G.cells.get(key(x, y));
    if (c) c.ch = ch;
  }
  for (const w of G.words.values()) {
    const cs = wordCells(w);
    if (cs.every(c => c.ch === c.ans)) { w.solved = true; cs.forEach(c => { c.solved = true; }); }
  }
  G.filledTo = data.filledTo | 0;
  G.depth = data.depth | 0; G.score = data.score | 0;
  G.solvedCount = data.solvedCount | 0; G.hints = data.hints | 0;
  number();
  return true;
}

/* ───────── 시작 ───────── */
function reset() {
  G.cells = new Map(); G.words = new Map(); G.nextId = 1; G.maxY = -1; G.filledTo = 0;
  G.depth = 0; G.score = 0; G.solvedCount = 0; G.hints = 0; G.recent = [];
  S.cur = null; S.dir = 'A'; S.comp = { cho: '', jung: '', jong: '' };
  els.forEach(el => el.remove());
  els.clear();
  scroller.scrollTop = 0;
  localStorage.removeItem(SAVE_KEY);
  grow(AHEAD);
  render();
}

document.getElementById('new').addEventListener('click', () => {
  if (G.solvedCount && !confirm('지금까지 푼 것을 버리고 새로 시작할까요?')) return;
  reset();
});
document.getElementById('hint').addEventListener('click', hint);
document.getElementById('prev').addEventListener('click', () => nextWord(-1));
document.getElementById('next').addEventListener('click', () => nextWord(1));
document.getElementById('help').addEventListener('click', () => document.getElementById('howto').showModal());
document.getElementById('howto').addEventListener('click', e => { if (e.target.id === 'howto') e.target.close(); });
document.getElementById('kbtoggle').addEventListener('click', () => {
  document.body.classList.toggle('nokb');
  setTimeout(() => { sizeCells(); render(); }, 50);
});

let scrollT;
scroller.addEventListener('scroll', () => {
  clearTimeout(scrollT);
  scrollT = setTimeout(() => { ensureAhead(); render(); }, 80);
}, { passive: true });

let resizeT;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { sizeCells(); render(); }, 120);
});

if (!matchMedia('(pointer: coarse)').matches) document.body.classList.add('nokb');
buildKeyboard();
sizeCells();
if (!load()) grow(AHEAD);
ensureAhead();
render();

if (location.search.includes('debug')) window.__cw = { G, S, W, key, grow, collapse, clearableY, render, wordCells, input, hint, after, nextWord, feed, assemble, disassemble };
})();
