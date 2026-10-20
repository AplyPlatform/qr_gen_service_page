// QR 코드 만들기 — 콘텐츠 빌드 + 발행 게이트
//
//   node _tools/build.mjs           점검 후 생성
//   node _tools/build.mjs --check   점검만 (파일을 쓰지 않는다)
//
// 원본 : _content/site.json (홈 FAQ·사이트 정보), _content/guides/*.json (가이드 한 편 = 질문 하나)
// 생성 : guide/<slug>/index.html, guide/index.html, index.html 의 build 표시 사이,
//        sitemap.xml, feed.xml, llms.txt
//
// 화면에 보이는 글과 JSON-LD 를 같은 원본에서 만들어, 둘이 어긋나는 일을 막는다.
// 게이트에 하나라도 걸리면 아무 파일도 쓰지 않고 멈춘다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");
const GA_ID = "G-VBKDLBJR2K";
const TZ = "T00:00:00+09:00";

const site = readJson("_content/site.json");
const BASE = site.baseUrl;
const ORG = site.organization;

const errors = [];
const warnings = [];

// ─── 원본 읽기 ────────────────────────────────────────────────────────────────
const allGuides = fs.readdirSync(path.join(ROOT, "_content/guides"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ file: f, ...readJson(`_content/guides/${f}`) }));
const guides = allGuides
  .filter((g) => g.status === "published")
  .sort((a, b) => b.datePublished.localeCompare(a.datePublished) || a.slug.localeCompare(b.slug));
const bySlug = Object.fromEntries(guides.map((g) => [g.slug, g]));

const guideUrl = (slug) => `${BASE}/guide/${slug}/`;
const hubUrl = `${BASE}/guide/`;

// ─── 발행 게이트 ──────────────────────────────────────────────────────────────
const REQUIRED = ["slug", "type", "question", "title", "seoTitle", "answer", "description",
  "datePublished", "dateModified", "dataAsof", "basis", "cta", "sections", "faq", "related", "changelog"];

for (const g of guides) {
  const at = `[${g.file}]`;
  for (const k of REQUIRED) {
    const v = g[k];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) errors.push(`${at} ${k} 가 비어 있다`);
  }
  if (g.slug && !/^[a-z0-9-]+$/.test(g.slug)) errors.push(`${at} slug 는 영문 소문자·숫자·- 만 쓴다`);
  if (g.slug && g.file !== `${g.slug}.json`) errors.push(`${at} 파일 이름과 slug 가 다르다`);
  checkLength(at, "seoTitle", g.seoTitle, 15, 60);
  checkLength(at, "description", g.description, 60, 160);
  if (g.answer && [...g.answer].length > 80) warnings.push(`${at} answer 가 ${[...g.answer].length}자 — 직답은 짧을수록 추출되기 쉽다`);
  if (g.dateModified < g.datePublished) errors.push(`${at} dateModified 가 datePublished 보다 앞선다`);
  if ((g.faq || []).length < 2) errors.push(`${at} FAQ 는 2개 이상`);
  for (const r of g.related || []) {
    if (r === g.slug) errors.push(`${at} related 에 자기 자신이 있다`);
    else if (!bySlug[r]) errors.push(`${at} related '${r}' 는 발행된 가이드가 아니다`);
  }
  const last = (g.changelog || []).at(-1);
  if (last && last.date !== g.dateModified) errors.push(`${at} changelog 마지막 날짜(${last.date})와 dateModified(${g.dateModified})가 다르다`);
  if (g.type === "data" && (g.sources || []).length === 0) errors.push(`${at} data 유형은 sources 가 필요하다`);
}

const homeHtmlPath = path.join(ROOT, "index.html");
const homeRaw = fs.readFileSync(homeHtmlPath, "utf8");
const homeDescription = (homeRaw.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
const homeTitle = (homeRaw.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
checkLength("[index.html]", "description", homeDescription, 60, 160);
checkLength("[_content/site.json hub]", "seoTitle", site.hub.seoTitle, 15, 60);
checkLength("[_content/site.json hub]", "description", site.hub.description, 60, 160);
checkUnique("title", [homeTitle, site.hub.seoTitle, ...guides.map((g) => g.seoTitle)]);
checkUnique("description", [homeDescription, site.hub.description, ...guides.map((g) => g.description)]);
checkUnique("question", guides.map((g) => g.question));

// ─── 렌더 ─────────────────────────────────────────────────────────────────────
const outputs = {};   // 상대 경로 → 내용

for (const g of guides) outputs[`guide/${g.slug}/index.html`] = renderGuide(g);
outputs["guide/index.html"] = renderHub();
outputs["index.html"] = renderHome(homeRaw);
outputs["sitemap.xml"] = renderSitemap();
outputs["feed.xml"] = renderFeed();
outputs["llms.txt"] = renderLlms();

// 만든 페이지 안의 사이트 내부 링크가 모두 살아 있는지
const liveRoutes = new Set(["/", "/guide/", ...guides.map((g) => `/guide/${g.slug}/`)]);
for (const [file, html] of Object.entries(outputs)) {
  if (!file.endsWith(".html")) continue;
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    const p = href.split(/[?#]/)[0];
    if (liveRoutes.has(p)) continue;
    if (fs.existsSync(path.join(ROOT, p))) continue;
    errors.push(`[${file}] 끊긴 내부 링크 ${href}`);
  }
}

// ─── 결과 ─────────────────────────────────────────────────────────────────────
for (const w of warnings) console.log(`경고  ${w}`);
if (errors.length) {
  for (const e of errors) console.log(`오류  ${e}`);
  console.log(`\n발행 게이트 통과 실패 (${errors.length}건). 파일을 쓰지 않았습니다.`);
  process.exit(1);
}

console.log(`발행 게이트 통과 — 가이드 ${guides.length}편 (초안 ${allGuides.length - guides.length}편 제외)`);
if (CHECK_ONLY) process.exit(0);

for (const [file, content] of Object.entries(outputs)) {
  const full = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const before = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
  if (before === content) continue;
  fs.writeFileSync(full, content, "utf8");
  console.log(`  썼음  ${file}`);
}

// ═════════════════════════════════════════════════════════════════════════════

function renderGuide(g) {
  const url = guideUrl(g.slug);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbLd([["QR 코드 만들기", `${BASE}/`], ["가이드", hubUrl], [g.title, url]]),
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: g.title,
        description: g.description,
        datePublished: g.datePublished + TZ,
        dateModified: g.dateModified + TZ,
        inLanguage: "ko-KR",
        mainEntityOfPage: url,
        image: site.ogImage,
        author: { "@id": ORG.id },
        publisher: { "@id": ORG.id },
      },
      faqLd(url, g.faq),
      orgRefLd(),
    ],
  };

  const related = (g.related || []).filter((s) => bySlug[s])      // 없는 slug 는 게이트가 이미 오류로 잡았다
    .map((s) => `<li><a href="/guide/${s}/">${esc(bySlug[s].title)}</a></li>`);
  related.push(`<li><a href="/guide/">${esc(site.hub.title)} 전체 보기</a></li>`);

  const body = [
    `<nav class="crumb" aria-label="현재 위치"><ol><li><a href="/">QR 코드 만들기</a></li><li><a href="/guide/">가이드</a></li><li aria-current="page">${esc(g.title)}</li></ol></nav>`,
    `<article>`,
    `<h1>${esc(g.title)}</h1>`,
    `<p class="answer">${esc(g.answer)}</p>`,
    `<p class="meta">기준일 ${g.dataAsof} · ${esc(ORG.name)} · ${esc(g.basis)}</p>`,
    ...g.sections.map(renderBlock),
    `<a class="cta" href="${esc(g.cta.href)}">${esc(g.cta.label)} →</a>`,
    `<section class="faq">`,
    `<h2>자주 묻는 질문</h2>`,
    ...g.faq.map((f) => `<h3>${esc(f.q)}</h3>\n<p>${esc(f.a)}</p>`),
    `</section>`,
    ...((g.sources || []).length
      ? [`<section class="sources">`, `<h2>출처</h2>`,
         `<ul>${g.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.name)}</a></li>`).join("")}</ul>`,
         `</section>`]
      : []),
    `<section class="related">`,
    `<h2>함께 보면 좋은 가이드</h2>`,
    `<ul>${related.join("")}</ul>`,
    `</section>`,
    `<p class="changelog">변경 이력: ${g.changelog.map((c) => `${c.date} ${esc(c.note)}`).join(" · ")}</p>`,
    `</article>`,
  ];

  return page({ title: g.seoTitle, description: g.description, url, ogType: "article", ld, body });
}

function renderHub() {
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbLd([["QR 코드 만들기", `${BASE}/`], ["가이드", hubUrl]]),
      {
        "@type": "CollectionPage",
        "@id": `${hubUrl}#page`,
        name: site.hub.title,
        description: site.hub.description,
        url: hubUrl,
        inLanguage: "ko-KR",
        publisher: { "@id": ORG.id },
        hasPart: guides.map((g) => ({ "@id": `${guideUrl(g.slug)}#article` })),
      },
      orgRefLd(),
    ],
  };

  const body = [
    `<nav class="crumb" aria-label="현재 위치"><ol><li><a href="/">QR 코드 만들기</a></li><li aria-current="page">가이드</li></ol></nav>`,
    `<div class="card">`,
    `<h1>${esc(site.hub.title)}</h1>`,
    `<p class="answer">${esc(site.hub.answer)}</p>`,
    `<ul class="guide-list">`,
    ...guides.map((g) => [
      `<li>`,
      `<h2><a href="/guide/${g.slug}/">${esc(g.title)}</a></h2>`,
      `<p>${esc(g.answer)}</p>`,
      `<p class="meta">기준일 ${g.dataAsof}</p>`,
      `</li>`,
    ].join("\n")),
    `</ul>`,
    `<a class="cta" href="/">QR 코드 만들기 →</a>`,
    `</div>`,
  ];

  return page({ title: site.hub.seoTitle, description: site.hub.description, url: hubUrl, ogType: "website", ld, body });
}

function renderHome(raw) {
  const homeUrl = `${BASE}/`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG.id,
        name: ORG.name,
        alternateName: ORG.alternateName,
        url: ORG.url,
        email: ORG.email,
        logo: ORG.logo,
      },
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        url: homeUrl,
        name: site.name,
        inLanguage: "ko-KR",
        publisher: { "@id": ORG.id },
      },
      {
        "@type": "WebApplication",
        "@id": `${homeUrl}#app`,
        name: site.name,
        url: homeUrl,
        description: site.summary,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "All",
        browserRequirements: "Requires JavaScript",
        inLanguage: "ko-KR",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
        featureList: site.features,
        provider: { "@id": ORG.id },
      },
      faqLd(homeUrl, site.faq),
    ],
  };

  const ldBlock = [`<script type="application/ld+json">`, ...jsonLd(ld).split("\n"), `</script>`];

  // 질문(가이드 제목)마다 접어 둔다. 펼친 내용도 HTML 에 그대로 있어 크롤러는 읽는다 (FAQPage LD 와 같은 글)
  const item = (heading, body) => [
    `\t\t\t<details class="faq-item py-3">`,
    `\t\t\t\t<summary class="list-none cursor-pointer flex items-center justify-between gap-3">`,
    `\t\t\t\t\t${heading}`,
    `\t\t\t\t\t<i class="fa fa-chevron-down text-gray-500 faq-chevron" aria-hidden="true"></i>`,
    `\t\t\t\t</summary>`,
    ...body.map((l) => `\t\t\t\t${l}`),
    `\t\t\t</details>`,
  ];

  const faqBlock = [
    `<div class="max-w-5xl mx-auto px-4 pb-6" id="faq">`,
    `\t<div class="bg-white rounded-2xl shadow-xl p-6">`,
    `\t\t<h2 class="text-2xl font-semibold text-gray-800 text-center mb-3">자주 묻는 질문</h2>`,
    `\t\t<div class="divide-y divide-gray-200">`,
    ...site.faq.flatMap((f) => item(
      `<h3 class="font-semibold text-gray-800">${esc(f.q)}</h3>`,
      [`<p class="text-gray-600 text-sm mt-2">${esc(f.a)}</p>`],
    )),
    `\t\t</div>`,
    `\t\t<h2 class="text-2xl font-semibold text-gray-800 text-center mt-8 mb-3">${esc(site.hub.title)}</h2>`,
    `\t\t<div class="divide-y divide-gray-200">`,
    ...guides.flatMap((g) => item(
      `<h3 class="font-semibold text-gray-800">${esc(g.title)}</h3>`,
      [
        `<p class="text-gray-600 text-sm mt-2">${esc(g.answer)}</p>`,
        `<a class="inline-block mt-2 text-sm text-teal-700 underline font-medium" href="/guide/${g.slug}/">${esc(g.title)} 자세히 보기 →</a>`,
      ],
    )),
    `\t\t</div>`,
    `\t\t<p class="text-center mt-5"><a class="text-teal-700 underline font-medium" href="/guide/">가이드 전체 보기</a></p>`,
    `\t</div>`,
    `</div>`,
  ];

  let out = replaceBetween(raw, "home-ld", ldBlock);
  out = replaceBetween(out, "home-faq", faqBlock);
  return out;
}

function renderSitemap() {
  const lastGuide = guides.map((g) => g.dateModified).sort().at(-1) || site.homeLastmod;
  const urls = [
    [`${BASE}/`, site.homeLastmod],
    [hubUrl, lastGuide],
    ...guides.map((g) => [guideUrl(g.slug), g.dateModified]),
  ];
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls.map(([loc, mod]) => `  <url><loc>${loc}</loc><lastmod>${mod}</lastmod></url>`),
    `</urlset>`,
    ``,
  ].join("\n");
}

function renderFeed() {
  const updated = (guides.map((g) => g.dateModified).sort().at(-1) || site.homeLastmod) + TZ;
  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ko">`,
    `  <title>${esc(site.hub.title)} - ${esc(site.name)}</title>`,
    `  <subtitle>${esc(site.hub.description)}</subtitle>`,
    `  <link href="${hubUrl}"/>`,
    `  <link rel="self" href="${BASE}/feed.xml"/>`,
    `  <id>${hubUrl}</id>`,
    `  <updated>${updated}</updated>`,
    `  <author><name>${esc(ORG.name)}</name><email>${esc(ORG.email)}</email></author>`,
    ...guides.flatMap((g) => [
      `  <entry>`,
      `    <title>${esc(g.title)}</title>`,
      `    <link href="${guideUrl(g.slug)}"/>`,
      `    <id>${guideUrl(g.slug)}</id>`,
      `    <published>${g.datePublished + TZ}</published>`,
      `    <updated>${g.dateModified + TZ}</updated>`,
      `    <summary>${esc(g.answer)}</summary>`,
      `  </entry>`,
    ]),
    `</feed>`,
    ``,
  ].join("\n");
}

function renderLlms() {
  const data = guides.filter((g) => g.type === "data");
  return [
    `# ${site.name}`,
    ``,
    `> ${site.summary}. ${ORG.name}(${ORG.alternateName})가 운영합니다.`,
    ``,
    `## 핵심 사실 (${site.homeLastmod} 기준)`,
    ...site.facts.map((f) => `- ${f}`),
    ``,
    `## 핵심 페이지`,
    `- [QR 코드 만들기](${BASE}/): 인터넷 주소·WiFi·전화번호·이메일 QR 코드 생성 도구와 자주 묻는 질문`,
    `- [${site.hub.title}](${hubUrl}): ${site.hub.answer}`,
    ...guides.map((g) => `- [${g.title}](${guideUrl(g.slug)}): ${g.answer}`),
    ...(data.length ? [``, `## 1차 데이터 (APLY 자체 측정)`, ...data.map((g) => `- [${g.title}](${guideUrl(g.slug)}): ${g.basis}`)] : []),
    ``,
    `## 운영·문의`,
    `- 운영: ${ORG.name} (${ORG.url})`,
    `- 문의: ${ORG.email}`,
    `- 인용 표기: ${site.name} (qr.aply.biz)`,
    ``,
  ].join("\n");
}

// ─── 조각 ─────────────────────────────────────────────────────────────────────

function page({ title, description, url, ogType, ld, body }) {
  return [
    `<!DOCTYPE html>`,
    `<html lang="ko">`,
    `<head>`,
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:locale" content="ko_KR">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${site.ogImage}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<link rel="icon" type="image/png" href="/images/favicon-32x32.png" sizes="32x32">`,
    `<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">`,
    `<link rel="alternate" type="application/atom+xml" title="${esc(site.hub.title)}" href="${BASE}/feed.xml">`,
    `<link rel="stylesheet" href="/css/guide.css">`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`,
    `<script type="application/ld+json">`,
    jsonLd(ld),
    `</script>`,
    `</head>`,
    `<body>`,
    `<header class="site-head"><div class="wrap"><a href="/">${esc(site.name)}</a></div></header>`,
    `<main class="wrap">`,
    ...body,
    `</main>`,
    `<footer class="site-foot">© <a href="${ORG.url}">${esc(ORG.name)} (${esc(ORG.alternateName)})</a> · <a href="/">QR 코드 만들기</a> · 문의 ${esc(ORG.email)}</footer>`,
    `</body>`,
    `</html>`,
    ``,
  ].join("\n");
}

// 섹션 블록. p·li·td 안의 글은 원본에서 쓴 HTML(링크 등)을 그대로 쓴다.
function renderBlock(b) {
  if (b.h2) return `<h2>${esc(b.h2)}</h2>`;
  if (b.p) return `<p>${b.p}</p>`;
  if (b.ol) return `<ol>\n${b.ol.map((i) => `<li>${i}</li>`).join("\n")}\n</ol>`;
  if (b.ul) return `<ul>\n${b.ul.map((i) => `<li>${i}</li>`).join("\n")}\n</ul>`;
  if (b.code) return `<pre><code>${esc(b.code)}</code></pre>`;
  if (b.table) {
    const t = b.table;
    return [
      `<div class="table-wrap"><table>`,
      ...(t.caption ? [`<caption>${esc(t.caption)}</caption>`] : []),
      `<thead><tr>${t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>`,
      `<tbody>`,
      ...t.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`),
      `</tbody>`,
      `</table></div>`,
    ].join("\n");
  }
  errors.push(`알 수 없는 섹션 블록: ${JSON.stringify(b)}`);
  return "";
}

function breadcrumbLd(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
  };
}

function faqLd(url, faq) {
  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// Organization 은 홈에서 한 번 온전히 선언하고, 다른 페이지는 같은 @id 로 가리킨다.
function orgRefLd() {
  return { "@type": "Organization", "@id": ORG.id, name: ORG.name, url: ORG.url };
}

function jsonLd(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
}

// index.html 의 <!-- build:NAME --> ~ <!-- /build:NAME --> 사이를 바꾼다. 줄바꿈·들여쓰기는 파일을 따른다.
function replaceBetween(html, name, lines) {
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  const re = new RegExp(`([ \\t]*)<!-- build:${name} -->[\\s\\S]*?<!-- /build:${name} -->`);
  const m = html.match(re);
  if (!m) {
    errors.push(`[index.html] <!-- build:${name} --> 표시를 찾지 못했다`);
    return html;
  }
  const indent = m[1];
  const inner = lines.map((l) => indent + l).join(eol);
  return html.replace(re, () => `${indent}<!-- build:${name} -->${eol}${inner}${eol}${indent}<!-- /build:${name} -->`);
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function checkLength(at, key, value, min, max) {
  if (!value) return;
  const n = [...value].length;
  if (n < min || n > max) errors.push(`${at} ${key} 길이 ${n}자 (허용 ${min}~${max}자)`);
}

function checkUnique(key, values) {
  const seen = new Set();
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) errors.push(`${key} 중복: "${v}"`);
    seen.add(v);
  }
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/^﻿/, ""));
}
