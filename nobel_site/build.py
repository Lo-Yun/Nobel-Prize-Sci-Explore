"""把 content/ 轉成可以直接放上網路的靜態網站（預設輸出到 _site/）。"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import content as C
from .markup import RenderContext, render_level

ROOT = C.ROOT
LEVELS = ["L1", "L2", "L3"]


def make_env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["tojson_attr"] = lambda v: json.dumps(v, ensure_ascii=False)
    return env


def prize_url(lang: str, slug: str, level: str) -> str:
    """從網站根目錄算起的路徑。"""
    return f"{lang}/prizes/{slug}/{level}.html"


def common_context(lang: str, root: str, cfg: dict, ui: dict) -> dict:
    langs = cfg.get("languages", {})
    return {
        "cfg": cfg,
        "ui": ui,
        "lang": lang,
        "lang_info": langs.get(lang, {}),
        "root": root,
        "levels": LEVELS,
        "home_url": f"{root}{lang}/index.html",
    }


def render_prize_page(prize: C.Prize, level: str, root: str, *, env=None, preview=False) -> tuple[str, list[str]]:
    """產生一個獎項某個程度的頁面。回傳 (HTML, 寫作錯誤清單)。"""
    env = env or make_env()
    cfg = C.load_config()
    ui = C.load_ui(prize.lang)
    fm, body = prize.levels.get(level, ({}, ""))
    ctx = RenderContext(characters=C.load_characters(prize.lang), root=root, ui=ui, level=level)
    intro_html, sections = render_level(body, ctx)

    # 科學接力棒：已經有頁面的相關獎項就加上連結
    related = []
    for r in prize.meta.get("related") or []:
        r = dict(r)
        slug = f'{r.get("year")}-{r.get("field")}'
        if C.SLUG_RE.match(slug) and (C.CONTENT / prize.lang / "prizes" / slug).exists():
            target = level if C.level_path(prize.lang, slug, level).exists() else "L1"
            r["href"] = f"{root}{prize_url(prize.lang, slug, target)}"
        related.append(r)

    other_langs = [
        lg for lg in C.list_languages()
        if lg != prize.lang and C.level_path(lg, prize.slug, level).exists()
    ]
    page = env.get_template("prize.html").render(
        **common_context(prize.lang, root, cfg, ui),
        prize=prize,
        meta=prize.meta,
        related=related,
        level=level,
        fm=fm,
        intro_html=intro_html,
        sections=sections,
        interactives=sorted(ctx.interactives),
        status=prize.status(level),
        available_levels=[lv for lv in LEVELS if lv in prize.levels],
        level_url=lambda lv: f"{root}{prize_url(prize.lang, prize.slug, lv)}",
        other_langs=other_langs,
        other_lang_url=lambda lg: f"{root}{prize_url(lg, prize.slug, level)}",
        preview=preview,
        progress_key=f"{prize.lang}/{prize.slug}",
    )
    return page, ctx.problems


def render_home(lang: str, root: str, env=None) -> str:
    env = env or make_env()
    cfg = C.load_config()
    ui = C.load_ui(lang)
    prizes = [p for p in C.list_prizes(lang) if p.levels]
    if not cfg.get("show_drafts", True):
        prizes = [p for p in prizes if any(p.status(lv) == "final" for lv in p.levels)]
    by_field = {f: [p for p in prizes if p.field == f] for f in cfg.get("fields", [])}
    series = {}
    for key in (ui.get("series") or {}):
        members = sorted((p for p in prizes if key in (p.meta.get("series") or [])), key=lambda p: p.year)
        if members:
            series[key] = members
    return env.get_template("home.html").render(
        **common_context(lang, root, cfg, ui),
        by_field=by_field,
        series=series,
        prize_href=lambda p, lv: f"{root}{prize_url(lang, p.slug, lv)}",
        all_langs=[lg for lg in C.list_languages() if C.list_prizes(lg)],
    )


def build(out_dir: Path | None = None, verbose=True) -> list[str]:
    """建置整個網站。回傳寫作錯誤清單（空的代表一切正常）。"""
    cfg = C.load_config()
    out = Path(out_dir or ROOT / cfg.get("output_dir", "_site"))
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    shutil.copytree(ROOT / "static", out / "static")
    env = make_env()
    problems: list[str] = []
    count = 0

    for lang in C.list_languages():
        prizes = C.list_prizes(lang)
        if not prizes:
            continue
        (out / lang).mkdir(parents=True, exist_ok=True)
        (out / lang / "index.html").write_text(render_home(lang, "../", env), encoding="utf-8")
        for prize in prizes:
            if not cfg.get("show_drafts", True) and all(prize.status(lv) != "final" for lv in prize.levels):
                continue
            pdir = out / lang / "prizes" / prize.slug
            pdir.mkdir(parents=True, exist_ok=True)
            assets = prize.dir / "assets"
            if assets.exists():
                shutil.copytree(assets, pdir / "assets")
            for level in prize.levels:
                html, probs = render_prize_page(prize, level, "../../../", env=env)
                (pdir / f"{level}.html").write_text(html, encoding="utf-8")
                problems += [f"[{lang}/{prize.slug}/{level}] {p}" for p in probs]
                count += 1

    default = cfg["default_language"]
    (out / "index.html").write_text(render_home(default, "", env), encoding="utf-8")
    if verbose:
        print(f"完成：產生 {count} 個獎項頁面 → {out}")
        for p in problems:
            print("  ⚠", p)
    return problems
