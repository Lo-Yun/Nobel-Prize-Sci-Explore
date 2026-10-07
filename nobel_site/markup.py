"""把文稿（Markdown + 特殊區塊）轉成 HTML。

文稿語法（寫在 L1.md / L2.md / L3.md 裡）：

    ## 標題                 → 一個段落區（每段會有「🔊 朗讀」按鈕）

    :::對話 小諾 開心        → 角色對話泡泡（角色名稱或代號 + 表情）
    文字……
    :::

    :::互動 xray-lens       → 插入互動元件（元件代號見 static/js/interactives/）
    :::

    :::小知識 標題           → 重點提示框
    文字……
    :::

    :::時間軸                → 時間軸（內容用 YAML 寫）
    - 時間: 1895-11-08
      事件: 倫琴發現螢光幕發光
    :::

    :::測驗                  → 小測驗（內容用 YAML 寫）
    - 問題: ……
      選項: [甲, 乙, 丙]
      答案: 1               # 從 0 開始數
      解說: ……
    :::

    {{名詞|解釋}}            → 滑過或點一下就會出現解釋的名詞

區塊名稱也可以用英文：chat, interactive, note, timeline, quiz。
"""
from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass, field

import markdown as md
import yaml

MD_EXTENSIONS = ["tables", "attr_list", "sane_lists", "md_in_html"]

ALIASES = {
    "對話": "chat", "chat": "chat",
    "互動": "interactive", "interactive": "interactive",
    "小知識": "note", "note": "note",
    "時間軸": "timeline", "timeline": "timeline",
    "測驗": "quiz", "quiz": "quiz",
    "圖": "figure", "figure": "figure",
}

# YAML 欄位的中英文對照（測驗、時間軸）
KEYS = {
    "問題": "q", "q": "q", "question": "q",
    "選項": "options", "options": "options",
    "答案": "answer", "answer": "answer",
    "解說": "explain", "explain": "explain",
    "時間": "when", "when": "when", "date": "when",
    "事件": "what", "what": "what", "event": "what",
}

TERM_RE = re.compile(r"\{\{([^{}|]+)\|([^{}]+)\}\}")
BLOCK_RE = re.compile(r"^:::\s*(\S+)(.*)$")


@dataclass
class RenderContext:
    """渲染時需要的外部資訊。"""
    characters: dict           # 角色資料（content/<lang>/characters.yaml）
    root: str = ""             # 網站根目錄的相對路徑，例如 "../../../"
    ui: dict = field(default_factory=dict)   # 介面文字
    interactives: set = field(default_factory=set)  # 這一頁用到的互動元件
    quiz_count: int = 0
    problems: list = field(default_factory=list)    # 寫作時的錯誤提示


@dataclass
class Section:
    id: str
    title: str
    html: str


def _norm_keys(item: dict) -> dict:
    return {KEYS.get(str(k).strip(), str(k).strip()): v for k, v in item.items()}


def _inline(text: str) -> str:
    return md.markdown(text, extensions=MD_EXTENSIONS)


def _terms(text: str) -> str:
    def rep(m):
        word, tip = m.group(1).strip(), m.group(2).strip()
        return (
            f'<span class="term" tabindex="0" data-tip="{html.escape(tip, quote=True)}">'
            f"{html.escape(word)}</span>"
        )
    return TERM_RE.sub(rep, text)


def find_character(ctx: RenderContext, name: str):
    for cid, c in ctx.characters.items():
        if name == cid or name == c.get("name"):
            return cid, c
    return None, None


def render_block(kind: str, args: list[str], body: str, ctx: RenderContext) -> str:
    if kind == "chat":
        who = args[0] if args else ""
        mood_word = args[1] if len(args) > 1 else ""
        cid, c = find_character(ctx, who)
        if not c:
            ctx.problems.append(f"找不到角色「{who}」，請到 characters.yaml 新增。")
            cid, c = "nuo", {"name": who, "moods": {}, "side": "left"}
        mood = c.get("moods", {}).get(mood_word, mood_word or "default")
        available = c.get("available_moods", ["default"])
        if mood not in available:
            mood = "default"
        side = c.get("side", "left")
        img = f'{ctx.root}static/img/characters/{c.get("image", cid)}-{mood}.svg'
        return (
            f'<div class="chat chat--{side}" data-character="{cid}">'
            f'<img class="chat__face" src="{img}" alt="{html.escape(c["name"])}" loading="lazy">'
            f'<div class="chat__bubble"><span class="chat__name">{html.escape(c["name"])}</span>'
            f"{_terms(_inline(body))}</div></div>"
        )

    if kind == "interactive":
        comp = args[0] if args else ""
        if not re.fullmatch(r"[a-z0-9-]+", comp):
            ctx.problems.append(f"互動元件名稱「{comp}」只能用小寫英文、數字和 -。")
            return ""
        ctx.interactives.add(comp)
        caption = _terms(_inline(body)) if body.strip() else ""
        return (
            f'<figure class="interactive"><div class="interactive__stage" data-component="{comp}">'
            f'<p class="interactive__fallback">{ctx.ui.get("loading_interactive", "互動載入中…")}</p></div>'
            + (f"<figcaption>{caption}</figcaption>" if caption else "")
            + "</figure>"
        )

    if kind == "note":
        title = " ".join(args) or ctx.ui.get("note", "小知識")
        return (
            f'<aside class="note"><p class="note__title">{html.escape(title)}</p>'
            f"{_terms(_inline(body))}</aside>"
        )

    if kind == "figure":
        src = args[0] if args else ""
        return (
            f'<figure class="figure"><img src="{html.escape(src)}" alt="" loading="lazy">'
            f"<figcaption>{_terms(_inline(body))}</figcaption></figure>"
        )

    if kind in ("timeline", "quiz"):
        try:
            items = yaml.safe_load(body) or []
            items = [_norm_keys(i) for i in items]
        except yaml.YAMLError as e:
            ctx.problems.append(f"{kind} 區塊的 YAML 格式有誤：{e}")
            return ""
        if kind == "timeline":
            rows = "".join(
                f'<li><span class="timeline__when">{html.escape(str(i.get("when", "")))}</span>'
                f'<div class="timeline__what">{_terms(_inline(str(i.get("what", ""))))}</div></li>'
                for i in items
            )
            return f'<ol class="timeline">{rows}</ol>'
        # quiz
        clean = []
        for n, i in enumerate(items, 1):
            if "q" not in i or "options" not in i or "answer" not in i:
                ctx.problems.append(f"測驗第 {n} 題缺少 問題／選項／答案。")
                continue
            clean.append({
                "q": str(i["q"]),
                "options": [str(o) for o in i["options"]],
                "answer": int(i["answer"]),
                "explain": _inline(str(i.get("explain", ""))),
            })
        ctx.quiz_count += 1
        data = html.escape(json.dumps(clean, ensure_ascii=False), quote=True)
        return f'<div class="quiz" data-quiz="{data}"></div>'

    ctx.problems.append(f"不認得的區塊「:::{kind}」。")
    return ""


def render_body(text: str, ctx: RenderContext) -> str:
    """處理 ::: 區塊與 {{名詞|解釋}}，其餘交給 Markdown。"""
    out_lines: list[str] = []
    blocks: list[str] = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        m = BLOCK_RE.match(lines[i].strip())
        if m and m.group(1) != "":
            kind = ALIASES.get(m.group(1))
            args = m.group(2).split()
            body_lines = []
            i += 1
            while i < len(lines) and lines[i].strip() != ":::":
                body_lines.append(lines[i])
                i += 1
            i += 1  # 跳過結尾的 :::
            if kind is None:
                ctx.problems.append(f"不認得的區塊「:::{m.group(1)}」。")
                continue
            blocks.append(render_block(kind, args, "\n".join(body_lines), ctx))
            out_lines += ["", f"<!--BLOCK{len(blocks) - 1}-->", ""]
        else:
            out_lines.append(lines[i])
            i += 1
    rendered = md.markdown(_terms("\n".join(out_lines)), extensions=MD_EXTENSIONS)
    for n, b in enumerate(blocks):
        rendered = rendered.replace(f"<!--BLOCK{n}-->", b)
    return rendered


def split_sections(text: str) -> tuple[str, list[tuple[str, str]]]:
    """依照「## 標題」切段。回傳（第一個 ## 之前的導言, [(標題, 內文), ...]）。"""
    intro, sections, cur_title, cur = [], [], None, []
    for line in text.splitlines():
        if line.startswith("## "):
            if cur_title is not None:
                sections.append((cur_title, "\n".join(cur)))
            cur_title, cur = line[3:].strip(), []
        elif cur_title is None:
            intro.append(line)
        else:
            cur.append(line)
    if cur_title is not None:
        sections.append((cur_title, "\n".join(cur)))
    return "\n".join(intro), sections


def render_level(text: str, ctx: RenderContext) -> tuple[str, list[Section]]:
    intro, parts = split_sections(text)
    sections = []
    for n, (title, body) in enumerate(parts, 1):
        sections.append(Section(id=f"s{n}", title=title, html=render_body(body, ctx)))
    return render_body(intro, ctx), sections
