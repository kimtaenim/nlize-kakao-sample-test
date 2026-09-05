# nlize-kakao-sample-test

카카오톡 선물하기 **건강 카테고리 랭킹 트래커** (클라우드 버전).

- **수집**: GitHub Actions가 매시간(정시+19분 UTC, +0~4분 랜덤 지연) [collect.mjs](collect.mjs)를 실행해
  건강 전체 / 건강식품·영양제 / 홍삼·즙·환 상위 300위와 관심 브랜드(네추럴라이즈 외 7개
  경쟁사) 전 상품 위시 수를 `docs/data/`에 JSONL로 커밋.
- **대시보드**: GitHub Pages(`docs/`)에서 순위 변동 차트·위시 증가 TOP10·가격대 분포·
  관심 브랜드 현황·랭킹 표 열람. 폰에서도 접속 가능.
- 카카오 서버 랭킹 자체가 약 1시간 단위로 갱신되므로 시간당 1회 수집이면 손실 없음.

## 최초 설정 (레포 주인 1회)

1. **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main`, 폴더: `/docs` → Save
2. **Actions 탭 → collect → Run workflow** 로 첫 수동 실행 (스케줄은 이후 자동)
3. 대시보드 주소: `https://kimtaenim.github.io/nlize-kakao-sample-test/`

## 구조

```
collect.mjs                  # 수집 스크립트 (Node 22, 의존성 없음)
.github/workflows/collect.yml
docs/index.html              # 대시보드 (정적, Chart.js CDN)
docs/data/<카테고리>/<날짜>.jsonl   # 스냅샷 DB (한 줄 = 1회 수집)
docs/data/watch/<날짜>.jsonl        # 관심 브랜드 스냅샷
docs/data/latest.json        # 대시보드용 사전 계산 (표·차트·관심브랜드)
docs/crossword/              # 곁다리: 무한 크로스워드 (정적, 의존성 없음)
```

## 무한 크로스워드 (덤)

`https://kimtaenim.github.io/nlize-kakao-sample-test/crossword/`

아래로 끝없이 이어지는 한글 가로세로 낱말 퍼즐. 스크롤로 내려가며 풀고, 화면 안의 칸은
순서 없이 아무 때나 풀 수 있다. **맨 윗부분이 빈틈없이 다 풀리면 그 줄들이 걷히고 남은
판이 위로 올라붙는다** — 그만큼 아래가 새로 생성되므로 끝이 없다.

- 단어·힌트: `docs/crossword/words.js` (238개, 배열에 `["단어","힌트"]` 추가만 하면 됨)
- 격자 생성·조합기·화면: `docs/crossword/game.js` (8열, 교차 배치 + 밀도 채우기)
- 입력: 화면 자판(두벌식) 또는 PC 물리 키보드 — 한/영을 **영문**에 두고 그대로 타이핑
- 진행 상황은 브라우저 `localStorage` 에 저장돼 새로고침해도 이어짐

## 설정 변경

- 관심 브랜드: `collect.mjs`의 `WATCH_BRANDS` (맨 앞이 주인공 = 강조 표시)
- 카테고리: `TARGETS` — navId 목록은 `curl https://gift.kakao.com/a/rank/v1/gift-rank/required-data`
- 수집 주기: `.github/workflows/collect.yml`의 cron (GitHub 스케줄은 몇 분 지연될 수 있음)

## 주의

- 비공식 내부 API 사용 — 카카오가 구조를 바꾸면 수정 필요.
- 데이터가 계속 쌓이므로(하루 약 5MB) 수개월 후 레포가 무거워지면 오래된 날짜 파일 정리 권장.
- 로컬 버전(`C:\myapps\gift-rank-tracker`)은 즉시 수집·AI 브리핑용 보조 도구로 계속 사용 가능.
