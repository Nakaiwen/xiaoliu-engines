# 小六太乙 · 共用引擎正本

[![核對引擎拷貝](https://github.com/Nakaiwen/xiaoliu-engines/actions/workflows/check.yml/badge.svg)](https://github.com/Nakaiwen/xiaoliu-engines/actions/workflows/check.yml)

小六太乙的排盤工具（八字、紫微、太乙、奇門……）共用同一批計算引擎。為了讓每個工具都能離線使用（PWA），每個工具裡各自放一份拷貝；這個 repo 存放**正本**，並登記每一份拷貝的位置，隨時核對有沒有走樣。

上方徽章綠色代表所有拷貝都與正本一致；紅色代表有拷貝需要處理。

## 收錄的引擎

| 引擎 | 正本版本 | 內容 |
|---|---|---|
| solar-lunar | 1.0.0 | 節氣、干支、農曆換算；1930–2100 年精確節氣表 |
| bazi-engine | 1.0.0 | 八字排盤引擎（含 2026-09-28 師承裁定）；依賴 solar-lunar |

拷貝清單見 [`registry.json`](registry.json)。

## 規矩

1. **算法只在這裡改。** 正本改好、測過，才同步到各工具。
2. 改了正本就要更新 `registry.json` 裡的 `version` 與 `sha256`，否則核對會提醒。
3. 同步時，依 `registry.json` 更新每一份拷貝（包含寫在網頁裡的「內嵌」版本），有離線快取（service worker）的工具要一併更新快取版本號。
4. 同步完執行核對，全部 ✓ 才算完成。

## 核對方式

需要 Node 18 以上，不必安裝套件。

```bash
node check.mjs                                # 從 GitHub 線上讀取各工具
node check.mjs --local ~/Documents/GitHub     # 讀取本機資料夾
```

另外每次推送、以及每週一早上，GitHub 會自動跑一次核對；結果不一致時會寄信通知。

## 版權

© 2026 小六太乙（nakaiwen.com）
