"""文稿工作室：在瀏覽器裡寫稿、預覽、產生網站。

啟動方式：
    pip install -r requirements.txt
    python studio.py

然後用瀏覽器打開 http://127.0.0.1:5000
（只在你自己的電腦上執行，不會對外開放。）
"""
from __future__ import annotations

import datetime as dt
import re
import shutil
from pathlib import Path

import yaml
from flask import Flask, abort, jsonify, redirect, render_template, request, send_from_directory, url_for
from werkzeug.utils import secure_filename

from nobel_site import content as C
from nobel_site.build import build, render_prize_page

ROOT = C.ROOT
BACKUP = ROOT / ".backup"
NEW_PRIZE_TEMPLATES = ROOT / "templates" / "new_prize"

app = Flask(
    __name__,
    static_folder=str(ROOT / "static"),
    static_url_path="/static",
    template_folder=str(ROOT / "templates" / "studio"),
)

STATUS_LABELS = {"draft": "草稿", "review": "審稿中", "final": "已定稿"}
FIELD_LABELS = {"physics": "物理", "chemistry": "化學", "medicine": "生理醫學"}


def check(lang: str, slug: str | None = None, level: str | None = None):
    """擋掉奇怪的網址，避免讀寫到 content/ 以外的檔案。"""
    if not C.LANG_RE.match(lang or ""):
        abort(404)
    if slug is not None and not C.SLUG_RE.match(slug):
        abort(404)
    if level is not None and not C.LEVEL_RE.match(level):
        abort(404)


def backup(path: Path):
    if path.exists():
        rel = path.relative_to(C.CONTENT)
        stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        dest = BACKUP / rel.parent / f"{path.stem}-{stamp}{path.suffix}"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)


def interactive_names() -> list[str]:
    return sorted(p.stem for p in (ROOT / "static" / "js" / "interactives").glob("*.js"))


# ------------------------------------------------------------------ 頁面
@app.get("/")
def dashboard():
    langs = C.list_languages()
    data = {lang: C.list_prizes(lang) for lang in langs}
    return render_template(
        "dashboard.html", data=data, cfg=C.load_config(),
        status_labels=STATUS_LABELS, field_labels=FIELD_LABELS,
        site_built=(ROOT / "_site" / "index.html").exists(),
    )


@app.get("/edit/<lang>/<slug>/<level>")
def edit(lang, slug, level):
    check(lang, slug, level)
    prize = C.load_prize(lang, slug)
    path = C.level_path(lang, slug, level)
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    chars = C.load_characters(lang)
    return render_template(
        "editor.html", lang=lang, slug=slug, level=level, prize=prize, text=text,
        status=prize.status(level), status_labels=STATUS_LABELS,
        characters=chars, interactives=interactive_names(),
        levels=["L1", "L2", "L3"],
    )


@app.get("/meta/<lang>/<slug>")
def edit_meta(lang, slug):
    check(lang, slug)
    path = C.CONTENT / lang / "prizes" / slug / "meta.yaml"
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    return render_template("meta.html", lang=lang, slug=slug, text=text)


@app.post("/new")
def new_prize():
    lang = request.form.get("lang", C.load_config()["default_language"])
    year = request.form.get("year", "").strip()
    field = request.form.get("field", "")
    title = request.form.get("title", "").strip() or "（尚未命名）"
    slug = f"{year}-{field}"
    check(lang, slug)
    d = C.CONTENT / lang / "prizes" / slug
    if d.exists():
        return redirect(url_for("edit", lang=lang, slug=slug, level="L1"))
    d.mkdir(parents=True)
    meta = {
        "year": int(year), "field": field, "title": title, "subtitle": "",
        "laureates": [{"name": "", "original": "", "country": "", "life": ""}],
        "citation": "", "citation_original": "", "cover_character": "nuo-default",
        "tags": [], "status": {"L1": "draft", "L2": "draft", "L3": "draft"},
        "related": [], "sources": [],
    }
    C.save_meta(lang, slug, meta)
    for level in ("L1", "L2", "L3"):
        tpl = NEW_PRIZE_TEMPLATES / f"{level}.md"
        text = tpl.read_text(encoding="utf-8").replace("{{title}}", title) if tpl.exists() else f"---\ntitle: {title}\n---\n"
        C.save_level(lang, slug, level, text)
    return redirect(url_for("edit", lang=lang, slug=slug, level="L1"))


# ------------------------------------------------------------------ API
@app.post("/api/preview/<lang>/<slug>/<level>")
def api_preview(lang, slug, level):
    check(lang, slug, level)
    text = request.get_json(force=True).get("text", "")
    prize = C.load_prize(lang, slug)
    try:
        prize.levels[level] = C.split_front_matter(text)
    except yaml.YAMLError as e:
        return jsonify(html=f"<p style='padding:2em'>開頭 --- 之間的設定格式有誤：{e}</p>", problems=[str(e)])
    html, problems = render_prize_page(prize, level, "/", preview=True)
    base = f'<base href="/assets/{lang}/{slug}/">'
    html = html.replace("<head>", "<head>" + base, 1)
    return jsonify(html=html, problems=problems)


@app.post("/api/save/<lang>/<slug>/<level>")
def api_save(lang, slug, level):
    check(lang, slug, level)
    body = request.get_json(force=True)
    text = body.get("text", "")
    try:
        C.split_front_matter(text)
    except yaml.YAMLError as e:
        return jsonify(ok=False, error=f"開頭 --- 之間的設定格式有誤，沒有存檔：{e}"), 400
    path = C.level_path(lang, slug, level)
    backup(path)
    C.save_level(lang, slug, level, text)
    status = body.get("status")
    if status in STATUS_LABELS:
        prize = C.load_prize(lang, slug)
        prize.meta.setdefault("status", {})[level] = status
        C.save_meta(lang, slug, prize.meta)
    return jsonify(ok=True, saved_at=dt.datetime.now().strftime("%H:%M:%S"))


@app.post("/api/meta/<lang>/<slug>")
def api_meta(lang, slug):
    check(lang, slug)
    text = request.get_json(force=True).get("text", "")
    try:
        data = yaml.safe_load(text)
        if not isinstance(data, dict):
            raise yaml.YAMLError("內容必須是「欄位: 值」的格式")
    except yaml.YAMLError as e:
        return jsonify(ok=False, error=f"格式有誤，沒有存檔：{e}"), 400
    path = C.CONTENT / lang / "prizes" / slug / "meta.yaml"
    backup(path)
    path.write_text(text.replace("\r\n", "\n"), encoding="utf-8")
    return jsonify(ok=True, saved_at=dt.datetime.now().strftime("%H:%M:%S"))


@app.post("/api/upload/<lang>/<slug>")
def api_upload(lang, slug):
    check(lang, slug)
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify(ok=False, error="沒有選擇檔案"), 400
    name = secure_filename(f.filename) or "image"
    if not re.search(r"\.(png|jpe?g|gif|svg|webp)$", name, re.I):
        return jsonify(ok=False, error="只接受圖片檔（png、jpg、gif、svg、webp）"), 400
    d = C.CONTENT / lang / "prizes" / slug / "assets"
    d.mkdir(parents=True, exist_ok=True)
    f.save(d / name)
    return jsonify(ok=True, snippet=f":::圖 assets/{name}\n圖說寫在這裡\n:::")


@app.post("/api/build")
def api_build():
    problems = build(verbose=False)
    return jsonify(ok=True, problems=problems)


# ------------------------------------------------------------------ 檔案
@app.get("/assets/<lang>/<slug>/<path:name>")
def prize_asset(lang, slug, name):
    check(lang, slug)
    return send_from_directory(C.CONTENT / lang / "prizes" / slug, name)


@app.get("/site/")
@app.get("/site/<path:name>")
def site(name="index.html"):
    return send_from_directory(ROOT / "_site", name)


@app.get("/candidates")
def candidates():
    path = ROOT / "planning" / "classic-candidates.yaml"
    data = C.load_yaml(path, {})
    return render_template("candidates.html", data=data, field_labels=FIELD_LABELS)


if __name__ == "__main__":
    print("文稿工作室啟動中… 用瀏覽器打開 http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
