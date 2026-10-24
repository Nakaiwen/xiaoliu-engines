#!/usr/bin/env node
/*
 * 小六太乙共用引擎 · 拷貝核對
 *
 * 依 registry.json，逐一比對每個工具裡的拷貝是否與正本逐字相同。
 * 不需要安裝任何套件（Node 18 以上）。
 *
 * 用法：
 *   node check.mjs                     從 GitHub 線上讀取各工具（預設）
 *   node check.mjs --local ~/Documents/GitHub
 *                                      讀取本機資料夾（底下每個工具一個資料夾，名稱同 repo）
 *
 * 結果：
 *   ✓ 與正本相同
 *   ⚠ 已知舊版（登記在 legacy，尚待升級；不算失敗）
 *   ✗ 與正本不同（需要處理）
 *   ? 讀不到檔案或找不到內嵌標記（需要處理）
 * 有任何 ✗ 或 ? 時，結束代碼為 1。
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(await readFile(path.join(here, 'registry.json'), 'utf8'));

const args = process.argv.slice(2);
const li = args.indexOf('--local');
const localRoot = li >= 0 ? args[li + 1]?.replace(/^~(?=$|\/)/, process.env.HOME || '~') : null;
if (li >= 0 && !localRoot) { console.error('--local 後面要接資料夾路徑'); process.exit(2); }

const norm = s => s.replace(/^﻿/, '').replace(/\r\n/g, '\n');
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');

async function load(repo, p) {
  if (localRoot) return readFile(path.join(localRoot, repo, p), 'utf8');
  const url = `https://raw.githubusercontent.com/${registry.owner}/${repo}/${registry.branch}/` +
    p.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/* 與 bazi-tool 測試相同的取法：找出含標記的 <script>，取標記之後的內容 */
function extractInline(html, marker) {
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const i = m[1].indexOf(marker);
    if (i >= 0) return m[1].slice(i + marker.length);
  }
  return null;
}

async function contentOf(c) {
  const text = norm(await load(c.repo, c.path));
  if (!c.inline) return text;
  const part = extractInline(text, c.inline);
  if (part === null) throw new Error('找不到內嵌標記');
  return part;
}

let problems = 0;
for (const [name, eng] of Object.entries(registry.engines)) {
  const master = norm(await readFile(path.join(here, eng.file), 'utf8'));
  console.log(`\n■ ${name}  正本 v${eng.version}（${eng.file}）`);
  if (sha(master) !== eng.sha256) {
    console.log('  ✗ 正本內容與登記的指紋不符：正本被修改過，請同時更新 registry.json 的 version 與 sha256');
    problems++;
  }

  const legacyShas = new Set(eng.legacy ? [eng.legacy.sha256] : []);
  const rows = [
    ...eng.copies.map(c => ({ ...c, legacy: false })),
    ...(eng.legacy?.copies || []).map(c => ({ ...c, legacy: true })),
  ];

  const results = await Promise.all(rows.map(async c => {
    const label = `${c.repo}/${c.path}${c.inline ? '（內嵌）' : ''}`;
    try {
      const body = await contentOf(c);
      const same = c.inline ? body.trim() === master.trim() : body === master;
      if (same) return c.legacy ? `  ✓ ${label}  已是新版，可以從 legacy 移到 copies` : `  ✓ ${label}`;
      if (c.legacy && legacyShas.has(sha(body))) return `  ⚠ ${label}  已知舊版，待升級`;
      problems++;
      return `  ✗ ${label}  與正本不同`;
    } catch (e) {
      problems++;
      const why = e.code === 'ENOENT' || /HTTP 404/.test(e.message) ? '找不到檔案' : e.message;
      return `  ? ${label}  ${why}`;
    }
  }));
  results.forEach(r => console.log(r));
}

console.log(problems ? `\n結果：有 ${problems} 處需要處理。` : '\n結果：全部拷貝都與正本一致。');
process.exit(problems ? 1 : 0);
