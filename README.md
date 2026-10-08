# 諾貝爾科學探險

用視覺化、故事化、擬人化與互動的方式，解讀歷年諾貝爾物理學獎、化學獎、生理學或醫學獎。
每個獎項都有三種程度：

| 程度 | 名稱 | 讀者 |
|---|---|---|
| L1 | 探險家 | 國小 |
| L2 | 研究員 | 中學、自學者 |
| L3 | 學者 | 大學 |

全站嚮導是戴眼鏡的貓頭鷹「小諾」。

## 快速開始

需要 Python 3.10 以上。

```bash
pip install -r requirements.txt

python studio.py      # 開啟文稿工作室 → 瀏覽器打開 http://127.0.0.1:5000
python build.py       # 只產生網站（輸出到 _site/）
```

## 平常怎麼改稿

1. 執行 `python studio.py`，用瀏覽器打開 http://127.0.0.1:5000 。
2. 在列表中點 **L1／L2／L3** 進入編輯畫面：左邊寫稿，右邊會即時預覽。
3. 用工具列插入對話、互動元件、小知識、時間軸、測驗。不熟悉語法時，可以展開下方的「語法小抄」。
4. 把狀態改成「審稿中」或「已定稿」，然後按 **存檔**（或 Ctrl／⌘ + S）。每次存檔前，舊版本都會自動備份到 `.backup/`。
5. 回到首頁按 **重新產生網站**，再點「看網站」確認結果。

得主、官方頒獎詞、科學接力棒與參考資料，放在每個獎項的「基本資料」（`meta.yaml`）裡。

## 資料夾說明

```
config.yaml                     網站設定（語言、是否顯示草稿）
content/
  zh-TW/                        一個語言一個資料夾
    characters.yaml             角色名稱與表情
    prizes/1901-physics/
      meta.yaml                 得主、頒獎詞、相關獎項、參考資料
      L1.md  L2.md  L3.md       三個程度的文稿
      assets/                   這個獎項專用的圖片（工作室上傳的圖片會放這裡）
i18n/zh-TW.yaml, en.yaml        介面文字（按鈕、標籤）
planning/                       規劃文件、經典獎項候選清單
static/
  css/site.css                  網站樣式
  js/site.js                    朗讀、測驗、學習紀錄
  js/interactives/*.js          互動元件（一個檔案一個元件）
  img/characters/*.svg          角色插圖（由 tools/draw_characters.py 產生）
templates/                      網頁版型（Jinja2，語法和 Python 很像）
nobel_site/                     Python 程式：讀文稿、轉換、產生網站
studio.py                       文稿工作室
build.py                        產生網站
```

## 文稿語法

文稿是 Markdown，另外加上幾種特殊區塊：

```
## 段落標題                  每段會自動加上「朗讀」按鈕

**重點**                     螢光筆標記

:::對話 小諾 開心             角色對話（角色名稱＋表情）
說的話
:::

:::互動 xray-lens            互動元件
元件下方的說明
:::

:::小知識 標題
補充說明
:::

{{名詞|解釋}}                 滑過去會出現解釋

:::時間軸
- 時間: 1895-11-08
  事件: 發生了什麼
:::

:::測驗
- 問題: 題目
  選項: [甲, 乙, 丙]
  答案: 1                    從 0 開始數
  解說: 為什麼
:::
```

## 多語言

1. 在 `config.yaml` 的 `languages` 加入新語言。
2. 新增 `i18n/<語言>.yaml`，翻譯介面文字。缺少的字串會自動用中文補上。
3. 新增 `content/<語言>/characters.yaml` 與 `content/<語言>/prizes/...`。

只要某個獎項有其他語言的版本，頁面右上角就會出現語言切換按鈕。網址格式是 `/<語言>/prizes/<年份-領域>/<程度>.html`。

互動元件裡的文字寫成 `{ "zh-TW": "…", en: "…" }`，會依照頁面語言自動切換。

## 學習紀錄

閱讀進度、測驗成績和偏好的程度，都存在讀者自己瀏覽器的 `localStorage` 裡，不需要帳號，也不會上傳到任何地方。

## 角色插圖

```bash
python tools/draw_characters.py
```

角色是用程式畫的 SVG（彩色素描風格）。要改顏色或表情，請修改這個檔案再重新執行。

## 上線（GitHub Pages）

儲存庫已經附上自動發佈設定（`.github/workflows/pages.yml`）。只要推送到預設分支，GitHub 就會自動執行 `python build.py`，並把 `_site/` 發佈到 GitHub Pages。

第一次使用前，請先做一次設定：

1. 到 GitHub 儲存庫的 **Settings → Pages**。
2. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
3. 到 **Actions** 分頁，選「發佈網站到 GitHub Pages」，按 **Run workflow**（或推送一次新的修改）。

完成後，網址是 `https://<帳號>.github.io/<儲存庫名稱>/`。

注意：私人（private）儲存庫要使用 GitHub Pages，需要付費方案（GitHub Pro 以上），而且發佈出去的網站任何人都看得到。

正式上線前，請把 `config.yaml` 的 `show_drafts` 改成 `false`，這樣只有「已定稿」的頁面會被發佈。
