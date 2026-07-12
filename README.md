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
```

## 설정 변경

- 관심 브랜드: `collect.mjs`의 `WATCH_BRANDS` (맨 앞이 주인공 = 강조 표시)
- 카테고리: `TARGETS` — navId 목록은 `curl https://gift.kakao.com/a/rank/v1/gift-rank/required-data`
- 수집 주기: `.github/workflows/collect.yml`의 cron (GitHub 스케줄은 몇 분 지연될 수 있음)

## 주의

- 비공식 내부 API 사용 — 카카오가 구조를 바꾸면 수정 필요.
- 데이터가 계속 쌓이므로(하루 약 5MB) 수개월 후 레포가 무거워지면 오래된 날짜 파일 정리 권장.
- 로컬 버전(`C:\myapps\gift-rank-tracker`)은 즉시 수집·AI 브리핑용 보조 도구로 계속 사용 가능.
