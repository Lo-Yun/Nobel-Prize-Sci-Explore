"""讀取 content/ 資料夾裡的文稿與設定。"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
SLUG_RE = re.compile(r"^\d{4}-(physics|chemistry|medicine)$")
LEVEL_RE = re.compile(r"^L[123]$")
LANG_RE = re.compile(r"^[a-z]{2}(-[A-Za-z]{2,4})?$")

STATUSES = ["draft", "review", "final"]


def load_yaml(path: Path, default=None):
    if not path.exists():
        return default
    return yaml.safe_load(path.read_text(encoding="utf-8")) or default


def load_config() -> dict:
    return load_yaml(ROOT / "config.yaml", {})


def load_ui(lang: str) -> dict:
    """介面文字。缺少的字串會用預設語言補上。"""
    cfg = load_config()
    base = load_yaml(ROOT / "i18n" / f'{cfg["default_language"]}.yaml', {})
    if lang != cfg["default_language"]:
        base = _deep_merge(base, load_yaml(ROOT / "i18n" / f"{lang}.yaml", {}))
    return base


def _deep_merge(a: dict, b: dict) -> dict:
    out = dict(a)
    for k, v in (b or {}).items():
        out[k] = _deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def load_characters(lang: str) -> dict:
    return load_yaml(CONTENT / lang / "characters.yaml", {})


def split_front_matter(text: str) -> tuple[dict, str]:
    if text.startswith("---"):
        parts = text.split("\n---", 1)
        if len(parts) == 2:
            fm = yaml.safe_load(parts[0][3:]) or {}
            return fm, parts[1].lstrip("\n")
    return {}, text


@dataclass
class Prize:
    lang: str
    slug: str
    meta: dict
    levels: dict = field(default_factory=dict)  # "L1" -> (front matter, body text)

    @property
    def dir(self) -> Path:
        return CONTENT / self.lang / "prizes" / self.slug

    @property
    def year(self) -> int:
        return int(self.meta.get("year", self.slug[:4]))

    @property
    def field(self) -> str:
        return self.meta.get("field", self.slug[5:])

    def status(self, level: str) -> str:
        return (self.meta.get("status") or {}).get(level, "draft")


def level_path(lang: str, slug: str, level: str) -> Path:
    return CONTENT / lang / "prizes" / slug / f"{level}.md"


def load_prize(lang: str, slug: str) -> Prize:
    d = CONTENT / lang / "prizes" / slug
    p = Prize(lang=lang, slug=slug, meta=load_yaml(d / "meta.yaml", {}))
    for level in ("L1", "L2", "L3"):
        f = d / f"{level}.md"
        if f.exists():
            p.levels[level] = split_front_matter(f.read_text(encoding="utf-8"))
    return p


def list_languages() -> list[str]:
    return sorted(p.name for p in CONTENT.iterdir() if p.is_dir() and LANG_RE.match(p.name))


def list_prizes(lang: str) -> list[Prize]:
    d = CONTENT / lang / "prizes"
    if not d.exists():
        return []
    prizes = [load_prize(lang, p.name) for p in d.iterdir() if p.is_dir() and SLUG_RE.match(p.name)]
    return sorted(prizes, key=lambda p: (p.year, p.field))


def save_level(lang: str, slug: str, level: str, text: str) -> Path:
    path = level_path(lang, slug, level)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.replace("\r\n", "\n"), encoding="utf-8")
    return path


def save_meta(lang: str, slug: str, meta: dict) -> None:
    path = CONTENT / lang / "prizes" / slug / "meta.yaml"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(meta, allow_unicode=True, sort_keys=False), encoding="utf-8")
