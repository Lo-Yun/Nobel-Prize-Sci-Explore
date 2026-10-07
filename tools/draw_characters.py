"""產生角色插圖（彩色素描風格 SVG）。

用法：
    python tools/draw_characters.py

會把角色圖檔寫到 static/img/characters/。想改顏色或表情，
修改下方 PALETTE 或各個 draw_* 函式，再重新執行一次即可。

素描感的做法：
  * 每個色塊先用「鉛筆顆粒」濾鏡上色（顏色會有點斑駁，像色鉛筆）。
  * 再疊一層斜線排線（hatch），增加手繪陰影感。
  * 最後用「抖動」濾鏡描兩次外框，線條會微微歪斜、不完全重疊。
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "static" / "img" / "characters"

INK = "#3a2e2a"

PALETTE = {
    # 小諾（貓頭鷹嚮導）
    "body": "#e59a4e",
    "wing": "#c8733a",
    "belly": "#f7e2b5",
    "face": "#fff4de",
    "glasses": "#2e4a7d",
    "beak": "#f2b33d",
    "cheek": "#f08a8a",
    "medal": "#e9b949",
    "ribbon_a": "#3d6fb6",
    "ribbon_b": "#d9534f",
    "feet": "#e98b3a",
    # 小X（X光小精靈）
    "xcore": "#9fdcff",
    "xray": "#b9a4ff",
    # 倫琴
    "skin": "#f2c9a0",
    "hair": "#6f5f52",
    "beard": "#9b8b7c",
    "suit": "#4a4e69",
    "shirt": "#fbf7ef",
}

DEFS = """
<defs>
  <filter id="rough" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="{seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="rough2" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="{seed2}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="G" yChannelSelector="R"/>
  </filter>
  <filter id="pencil" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="grain"/>
    <feColorMatrix in="grain" type="matrix"
      values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.75" result="mask"/>
    <feComposite in="SourceGraphic" in2="mask" operator="in" result="tex"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="{seed}" result="n"/>
    <feDisplacementMap in="tex" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
    <line x1="0" y1="0" x2="0" y2="5" stroke="{ink}" stroke-width="1.1"/>
  </pattern>
</defs>
"""


def attrs(d):
    return " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in d.items())


def shape(tag, color, hatch=0.16, stroke=2.4, **geo):
    """一個「色鉛筆」色塊：上色 + 排線 + 兩道抖動外框。"""
    g = attrs(geo)
    tf = geo.pop("transform", "")
    g2 = attrs(geo)
    parts = [f'<{tag} {g} fill="{color}" filter="url(#pencil)"/>']
    if hatch:
        parts.append(f'<{tag} {g} fill="url(#hatch)" opacity="{hatch}" filter="url(#rough)"/>')
    if stroke:
        parts.append(
            f'<{tag} {g} fill="none" stroke="{INK}" stroke-width="{stroke}" '
            f'stroke-linejoin="round" stroke-linecap="round" filter="url(#rough)"/>'
        )
        parts.append(
            f'<{tag} {g2} fill="none" stroke="{INK}" stroke-width="{stroke * 0.45:.2f}" '
            f'opacity=".55" stroke-linecap="round" filter="url(#rough2)" '
            f'transform="translate(1.2 -0.8) {tf}"/>'
        )
    return "\n".join(parts)


def line(d, width=3, color=INK, opacity=1):
    return (
        f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" opacity="{opacity}" '
        f'stroke-linecap="round" stroke-linejoin="round" filter="url(#rough)"/>'
    )


def svg(viewbox, body, seed=4):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">'
        + DEFS.format(seed=seed, seed2=seed + 5, ink=INK)
        + body
        + "</svg>\n"
    )


# ---------------------------------------------------------------- 小諾
def draw_nuo(mood):
    P = PALETTE
    b = []
    # 耳羽
    b.append(shape("path", P["body"], d="M54 74 L66 22 L98 60 Z"))
    b.append(shape("path", P["body"], d="M166 74 L154 22 L122 60 Z"))
    # 翅膀（左）
    b.append(shape("ellipse", P["wing"], cx=44, cy=152, rx=19, ry=46, transform="rotate(14 44 152)"))
    # 翅膀（右）：開心／預設時舉起來揮手
    if mood in ("default", "happy"):
        b.append(shape("ellipse", P["wing"], cx=184, cy=108, rx=17, ry=44, transform="rotate(38 184 108)"))
    else:
        b.append(shape("ellipse", P["wing"], cx=176, cy=152, rx=19, ry=46, transform="rotate(-14 176 152)"))
    # 身體
    b.append(shape("ellipse", P["body"], cx=110, cy=144, rx=72, ry=82))
    # 肚子
    b.append(shape("ellipse", P["belly"], hatch=0.08, cx=110, cy=176, rx=46, ry=46))
    for y in (160, 180, 200):
        for x in (88, 110, 132):
            b.append(line(f"M{x-6} {y} Q{x} {y+6} {x+6} {y}", width=1.6, opacity=0.55))
    # 臉盤
    b.append(shape("circle", P["face"], hatch=0.06, cx=84, cy=112, r=29))
    b.append(shape("circle", P["face"], hatch=0.06, cx=136, cy=112, r=29))
    # 眼睛
    if mood == "happy":
        b.append(line("M73 118 Q85 102 97 118", width=4.5))
        b.append(line("M123 118 Q135 102 147 118", width=4.5))
    elif mood == "thinking":
        for cx in (91, 143):
            b.append(f'<circle cx="{cx}" cy="105" r="10" fill="{INK}" filter="url(#rough)"/>')
            b.append(f'<circle cx="{cx+3}" cy="101" r="3.2" fill="#fff"/>')
        b.append(line("M70 86 Q84 78 98 84", width=3))
        b.append(line("M122 80 Q136 74 150 82", width=3))
    elif mood == "surprised":
        for cx in (84, 136):
            b.append(f'<circle cx="{cx}" cy="112" r="13" fill="#fff" stroke="{INK}" stroke-width="2" filter="url(#rough)"/>')
            b.append(f'<circle cx="{cx}" cy="112" r="6" fill="{INK}" filter="url(#rough)"/>')
    else:
        for cx in (86, 134):
            b.append(f'<circle cx="{cx}" cy="114" r="10.5" fill="{INK}" filter="url(#rough)"/>')
            b.append(f'<circle cx="{cx+3}" cy="110" r="3.4" fill="#fff"/>')
    # 眼鏡
    for cx in (84, 136):
        b.append(f'<circle cx="{cx}" cy="112" r="25" fill="none" stroke="{P["glasses"]}" stroke-width="4" filter="url(#rough)"/>')
    b.append(line("M108 108 Q110 102 112 108", width=3.5, color=P["glasses"]))
    # 臉頰
    b.append(f'<ellipse cx="62" cy="140" rx="9" ry="6" fill="{P["cheek"]}" opacity=".55" filter="url(#pencil)"/>')
    b.append(f'<ellipse cx="158" cy="140" rx="9" ry="6" fill="{P["cheek"]}" opacity=".55" filter="url(#pencil)"/>')
    # 嘴
    if mood == "surprised":
        b.append(shape("ellipse", P["beak"], hatch=0, cx=110, cy=140, rx=8, ry=10))
    else:
        b.append(shape("path", P["beak"], hatch=0, d="M101 130 L119 130 L110 146 Z"))
    # 思考時：翅膀托著下巴
    if mood == "thinking":
        b.append(shape("ellipse", P["wing"], cx=134, cy=156, rx=12, ry=28, transform="rotate(-62 134 156)"))
    # 獎牌
    b.append(shape("path", P["ribbon_a"], hatch=0.1, stroke=1.8, d="M96 170 L104 170 L112 196 L106 198 Z"))
    b.append(shape("path", P["ribbon_b"], hatch=0.1, stroke=1.8, d="M124 170 L116 170 L108 196 L114 198 Z"))
    b.append(shape("circle", P["medal"], hatch=0.12, cx=110, cy=204, r=13))
    b.append(line("M104 204 L110 198 L116 204 L110 210 Z", width=1.8, opacity=0.7))
    # 腳
    for cx in (88, 132):
        for dx in (-7, 0, 7):
            b.append(shape("ellipse", P["feet"], hatch=0, stroke=1.6, cx=cx + dx, cy=228, rx=5, ry=7))
    # 心情符號
    if mood == "thinking":
        b.append(line("M186 30 Q194 14 206 26 Q212 38 198 44 L198 54", width=4))
        b.append(f'<circle cx="198" cy="64" r="3" fill="{INK}"/>')
    if mood == "surprised":
        b.append(line("M190 26 L192 54", width=4))
        b.append(f'<circle cx="193" cy="64" r="3" fill="{INK}"/>')
        b.append(line("M206 34 L202 56", width=4))
        b.append(f'<circle cx="201" cy="65" r="3" fill="{INK}"/>')
    if mood == "happy":
        b.append(line("M20 40 L28 48 M28 40 L20 48", width=2.5, color="#e9b949"))
        b.append(line("M196 30 L206 40 M206 30 L196 40", width=2.5, color="#e9b949"))
    return svg("0 0 220 240", "\n".join(b), seed=4)


# ---------------------------------------------------------------- 小X
def draw_xray(mood):
    P = PALETTE
    import math

    pts = []
    for i in range(16):
        r = 66 if i % 2 == 0 else 40
        a = math.pi * 2 * i / 16 - math.pi / 2
        pts.append(f"{80 + r * math.cos(a):.1f} {84 + r * math.sin(a):.1f}")
    b = [shape("path", P["xray"], hatch=0.14, d="M" + " L".join(pts) + " Z")]
    b.append(shape("circle", P["xcore"], hatch=0.08, cx=80, cy=84, r=34))
    if mood == "happy":
        b.append(line("M62 82 Q69 72 76 82", width=3.5))
        b.append(line("M86 82 Q93 72 100 82", width=3.5))
    else:
        for cx in (69, 93):
            b.append(f'<circle cx="{cx}" cy="80" r="6.5" fill="{INK}" filter="url(#rough)"/>')
            b.append(f'<circle cx="{cx+2}" cy="77" r="2.2" fill="#fff"/>')
    b.append(line("M70 96 Q81 106 92 96", width=3))
    b.append(f'<ellipse cx="58" cy="94" rx="6" ry="4" fill="{P["cheek"]}" opacity=".5"/>')
    b.append(f'<ellipse cx="104" cy="94" rx="6" ry="4" fill="{P["cheek"]}" opacity=".5"/>')
    return svg("0 0 160 160", "\n".join(b), seed=8)


# ---------------------------------------------------------------- 倫琴
def draw_rontgen(mood):
    P = PALETTE
    b = []
    b.append(shape("path", P["suit"], hatch=0.2, d="M28 238 Q34 168 100 160 Q166 168 172 238 Z"))
    b.append(shape("path", P["shirt"], hatch=0.05, stroke=1.8, d="M82 164 L100 200 L118 164 Z"))
    b.append(shape("path", "#2b2d42", hatch=0, stroke=1.6, d="M94 176 L100 186 L106 176 L100 170 Z"))
    b.append(shape("ellipse", P["skin"], hatch=0.06, cx=100, cy=92, rx=40, ry=50))
    # 頭髮（向後梳）
    b.append(shape("path", P["hair"], hatch=0.25, d="M58 92 Q50 52 72 38 Q100 22 130 38 Q152 52 142 92 Q138 70 126 72 Q118 60 104 66 Q92 58 82 68 Q66 66 58 92 Z"))
    # 耳朵
    b.append(shape("ellipse", P["skin"], hatch=0, stroke=1.8, cx=60, cy=98, rx=7, ry=11))
    b.append(shape("ellipse", P["skin"], hatch=0, stroke=1.8, cx=140, cy=98, rx=7, ry=11))
    # 大鬍子
    b.append(shape("path", P["beard"], hatch=0.28,
                   d="M62 104 Q64 150 84 170 Q100 184 116 170 Q136 150 138 104 Q128 128 116 122 Q100 116 84 122 Q72 128 62 104 Z"))
    b.append(shape("path", P["beard"], hatch=0.2, stroke=1.8, d="M80 122 Q100 108 120 122 Q100 132 80 122 Z"))
    # 眼睛眉毛
    if mood == "happy":
        b.append(line("M76 92 Q84 84 92 92", width=3))
        b.append(line("M108 92 Q116 84 124 92", width=3))
    else:
        b.append(f'<circle cx="84" cy="92" r="4.5" fill="{INK}" filter="url(#rough)"/>')
        b.append(f'<circle cx="116" cy="92" r="4.5" fill="{INK}" filter="url(#rough)"/>')
    b.append(line("M72 80 Q84 72 94 78", width=3.5, color="#5d4e42"))
    b.append(line("M106 78 Q116 72 128 80", width=3.5, color="#5d4e42"))
    b.append(line("M100 96 Q96 108 102 110", width=2.2, opacity=0.8))
    return svg("0 0 200 240", "\n".join(b), seed=6)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = {
        "nuo": (draw_nuo, ["default", "happy", "thinking", "surprised"]),
        "xray": (draw_xray, ["default", "happy"]),
        "rontgen": (draw_rontgen, ["default", "happy"]),
    }
    for name, (fn, moods) in jobs.items():
        for mood in moods:
            path = OUT / f"{name}-{mood}.svg"
            path.write_text(fn(mood), encoding="utf-8")
            print("寫入", path.relative_to(OUT.parent.parent.parent))


if __name__ == "__main__":
    main()
