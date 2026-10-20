# 검색·AI 인용 운영 안내 (qr.aply.biz)

`_` 로 시작하는 폴더는 GitHub Pages(Jekyll)가 공개하지 않는다. 이 폴더의 문서는 사이트에 올라가지 않는다.

## 파일 지도

| 파일 | 역할 |
|---|---|
| `_content/site.json` | 홈 FAQ·사이트 정보·llms.txt 핵심 사실의 단일 원본 |
| `_content/guides/<slug>.json` | 가이드 한 편 = 질문 하나. 화면과 JSON-LD 를 모두 여기서 만든다 |
| `_content/backlog.md` | 답할 질문의 대기열 |
| `_content/inventory.md` | 발행한 페이지 목록 + 측정 기록 |
| `_content/measure.md` | 기준선과 재측정 일정 |
| `_tools/build.mjs` | 발행 게이트 + 생성 (guide/, index.html 의 build 표시 사이, sitemap.xml, feed.xml, llms.txt) |
| `_tools/indexnow.mjs` | 배포 뒤 Bing·네이버에 새 주소 알림 |
| `_tools/make_og.py` | 공유 미리보기 이미지 `images/og_qr.png` 생성 |

**생성되는 파일은 손으로 고치지 않는다.** `guide/**`, `sitemap.xml`, `feed.xml`, `llms.txt`, 그리고 `index.html` 의 `<!-- build:... -->` 사이는 다음 빌드 때 덮어써진다.

## 글 한 편 발행하기

1. `backlog.md` 에서 질문을 고르고 브리프 다섯 줄을 채운다 — 못 채우면 아직 쓸 수 없는 글이다.
   ```
   질문:      (검색창에 치는 문장 그대로)
   직답:      (한 문장, 수치·조건 포함)
   근거:      (표 1개 + 기준일 + 출처 또는 실측 방법)
   하위 질문: (FAQ 가 될 3개)
   내부 링크: (관련 가이드 2개)
   ```
2. `_content/guides/` 의 기존 파일을 복사해 `<slug>.json` 을 만든다. `status: "draft"` 로 시작한다.
3. 사람이 검수한다 — **모든 수치를 원출처·실제 동작과 대조**하고, 서비스가 실제로 하지 않는 일을 쓰지 않는다.
4. `status: "published"` 로 바꾸고 `node _tools/build.mjs` — 게이트에 걸리면 파일이 하나도 써지지 않는다.
5. 로컬 확인: `python -m http.server` 로 띄워 페이지·표·FAQ 를 본다.
6. 커밋·푸시 → GitHub Pages 반영 확인 → `node _tools/indexnow.mjs /guide/<slug>/`
7. 네이버 서치어드바이저·구글 서치 콘솔에서 해당 주소 수집(색인) 요청.
8. `inventory.md` 에 행을 추가하고 14일 뒤 재측정 날짜를 적는다.

게이트가 보는 것: 필수 항목, slug 형식, 제목 15~60자, 설명 60~160자, FAQ 2개 이상, related 가 발행된 글인지,
changelog 마지막 날짜 = dateModified, data 유형의 출처, 제목·설명·질문 중복, 끊긴 내부 링크.

## 갱신 규칙

- 서비스 동작이 바뀌면(예: 단축 주소 길이, 지원 종류, 파일 형식) **관련 가이드·site.json FAQ·facts 를 같은 커밋에서** 고친다.
  낡은 서술이 남은 페이지가 AI 의 "사실"이 된다.
- `dateModified` 는 내용이 실제로 바뀐 때만 올리고, `changelog` 에 한 줄을 남긴다.
- 같은 질문을 다루는 글이 둘이 되면 하나로 합치고, 없앤 주소는 새 주소로 안내한다 (GitHub Pages 는 301 을 못 하므로
  예전 주소에 canonical + 새 주소 링크를 둔 페이지를 남긴다).
- 주소(slug)는 바꾸지 않는다.

## 검색엔진 등록 (계정이 필요해 직접 해야 하는 일)

### 네이버 서치어드바이저 — searchadvisor.naver.com
1. 로그인 → 웹마스터 도구 → 사이트 등록에 `https://qr.aply.biz` 입력.
2. 소유 확인: **HTML 파일 업로드**를 고른다. 받은 `naver*.html` 파일을 저장소 루트에 커밋·푸시한 뒤 확인을 누른다.
3. 요청 → 사이트맵 제출: `https://qr.aply.biz/sitemap.xml`
4. 요청 → RSS 제출: `https://qr.aply.biz/feed.xml`
5. 요청 → 웹 페이지 수집: `/`, `/guide/`, `/guide/wifi-qr/`, `/guide/url-qr/`, `/guide/qr-expiration/`
6. 검증 → robots.txt 에서 Yeti 허용 확인.

### 구글 서치 콘솔 — search.google.com/search-console
1. 속성 추가. aply.biz 하위 서비스가 많으므로 **도메인 속성 `aply.biz`(DNS TXT 확인)** 를 권장 — 모든 하위 도메인을 한 번에 본다.
   DNS 를 만질 수 없으면 URL 접두어 `https://qr.aply.biz/` + HTML 파일 확인.
2. Sitemaps → `https://qr.aply.biz/sitemap.xml` 제출.
3. URL 검사 → 위 다섯 주소 색인 생성 요청.

### Bing 웹마스터 도구 — bing.com/webmasters
1. 구글 서치 콘솔에서 가져오기(Import)를 고르면 소유 확인과 사이트맵이 함께 넘어온다.
2. ChatGPT 검색·Copilot 은 Bing 색인을 쓴다 — 이 등록이 AI 인용의 절반이다.
3. 등록 후 `node _tools/indexnow.mjs` 로 전체 주소를 알린다.
