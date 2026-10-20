// IndexNow 핑 — 새로 발행·갱신한 페이지를 Bing·네이버 등에 바로 알린다. (Google 은 IndexNow 를 쓰지 않는다)
//
//   node _tools/indexnow.mjs                      sitemap.xml 의 모든 주소
//   node _tools/indexnow.mjs /guide/wifi-qr/      지정한 주소만
//
// 반드시 배포(GitHub Pages 반영)가 끝난 뒤에 실행한다. 먼저 키 파일이 열리는지 확인하고,
// 열리지 않으면 핑하지 않는다 (키 확인에 실패한 핑은 무시된다).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "_content/site.json"), "utf8"));
const BASE = site.baseUrl;
const KEY = site.indexNowKey;
const keyLocation = `${BASE}/${KEY}.txt`;

const args = process.argv.slice(2);
const urls = args.length
  ? args.map((a) => (a.startsWith("http") ? a : BASE + a))
  : [...fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const keyRes = await fetch(keyLocation);
const keyBody = keyRes.ok ? (await keyRes.text()).trim() : "";
if (keyBody !== KEY) {
  console.error(`키 파일 확인 실패: ${keyLocation} (HTTP ${keyRes.status}). 배포가 끝났는지 확인하세요.`);
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(BASE).host, key: KEY, keyLocation, urlList: urls }),
});

// 200 = 접수, 202 = 접수(키 확인 대기). 그 밖은 실패.
console.log(`IndexNow HTTP ${res.status} — ${urls.length}개 주소`);
for (const u of urls) console.log(`  ${u}`);
if (res.status !== 200 && res.status !== 202) {
  console.error(await res.text());
  process.exit(1);
}
