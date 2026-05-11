#!/usr/bin/env node

import { readdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(__dirname, "..", "docs");

const files = readdirSync(docsDir)
  .filter((f) => f.startsWith("people-pleasing-") && f.endsWith(".html"))
  .sort()
  .reverse();

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

const links = files.slice(0, 60)
  .map((f) => {
    const dateStr = f.replace("people-pleasing-", "").replace(".html", "");
    let dateDisplay = dateStr;
    let weekday = "";
    try {
      const d = new Date(dateStr);
      dateDisplay = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
      weekday = weekdays[d.getDay()];
    } catch {}
    return `<li><a href="${f}">📅 ${dateDisplay}（週${weekday}）</a></li>`;
  })
  .join("\n");

const total = files.length;

const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>People-Pleasing Personality · 討好型人格研究文獻日報</title>
<meta name="description" content="討好型人格研究文獻日報，每日自動更新，由 AI 彙整 PubMed 最新論文"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  :root { --bg: #f6f1e8; --surface: #fffaf2; --line: #d8c5ab; --text: #2b2118; --muted: #766453; --accent: #8c4f2b; --accent-soft: #ead2bf; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: radial-gradient(circle at top, #fff6ea 0, var(--bg) 55%, #ead8c6 100%); color: var(--text); font-family: "Noto Sans TC", "PingFang TC", "Helvetica Neue", Arial, sans-serif; min-height: 100vh; }
  .container { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; padding: 80px 24px; }
  .logo { font-size: 48px; text-align: center; margin-bottom: 16px; }
  h1 { text-align: center; font-size: 24px; color: var(--text); margin-bottom: 8px; }
  .subtitle { text-align: center; color: var(--accent); font-size: 14px; margin-bottom: 12px; }
  .description { text-align: center; color: var(--muted); font-size: 13px; margin-bottom: 48px; line-height: 1.8; max-width: 480px; margin-left: auto; margin-right: auto; }
  .count { text-align: center; color: var(--muted); font-size: 13px; margin-bottom: 32px; }
  ul { list-style: none; }
  li { margin-bottom: 8px; }
  a { color: var(--text); text-decoration: none; display: block; padding: 14px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; transition: all 0.2s; font-size: 15px; }
  a:hover { background: var(--accent-soft); border-color: var(--accent); transform: translateX(4px); }
  .links-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 32px; flex-wrap: wrap; }
  .links-row a { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 13px; border-radius: 20px; }
  footer { margin-top: 56px; text-align: center; font-size: 12px; color: var(--muted); }
  footer a { display: inline; padding: 0; background: none; border: none; color: var(--muted); }
  footer a:hover { color: var(--accent); }
</style>
</head>
<body>
<div class="container">
  <div class="logo">🤝</div>
  <h1>People-Pleasing Personality</h1>
  <p class="subtitle">討好型人格研究文獻日報 · 每日自動更新</p>
  <p class="description">涵蓋人際迎合、依附焦慮、害怕拒絕、自我壓抑、衝突迴避、共依附、依賴型人格等研究主題，由 AI 自動彙整分析 PubMed 最新論文。</p>
  <div class="links-row">
    <a href="https://www.leepsyclinic.com/" target="_blank" rel="noopener">🏥 李政洋身心診所</a>
    <a href="https://blog.leepsyclinic.com/" target="_blank" rel="noopener">📬 訂閱電子報</a>
    <a href="https://buymeacoffee.com/CYlee" target="_blank" rel="noopener">☕ Buy Me a Coffee</a>
  </div>
  <p class="count">共 ${total} 期日報</p>
  <ul>${links}</ul>
  <footer>
    <p>Powered by PubMed + Zhipu AI · <a href="https://github.com/u8901006/people-pleasing-personality">GitHub</a></p>
  </footer>
</div>
</body>
</html>`;

writeFileSync(resolve(docsDir, "index.html"), html, "utf8");
console.error(`[INFO] Index page generated (${total} reports)`);
