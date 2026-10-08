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
    """小諾：圓滾滾的貓頭鷹。身體幾乎是一顆球，耳羽、翅膀、腳都是圓角。"""
    P = PALETTE
    b = []
    # 耳羽（圓圓的小角）
    b.append(shape("path", P["body"], d="M50 92 Q36 50 62 34 Q82 42 94 68 Z"))
    b.append(shape("path", P["body"], d="M170 92 Q184 50 158 34 Q138 42 126 68 Z"))
    # 翅膀（左）
    b.append(shape("ellipse", P["wing"], cx=30, cy=154, rx=17, ry=34, transform="rotate(16 30 154)"))
    # 翅膀（右）：開心／預設時舉起來揮手
    if mood in ("default", "happy"):
        b.append(shape("ellipse", P["wing"], cx=192, cy=104, rx=16, ry=32, transform="rotate(42 192 104)"))
    else:
        b.append(shape("ellipse", P["wing"], cx=190, cy=154, rx=17, ry=34, transform="rotate(-16 190 154)"))
    # 身體：圓球
    b.append(shape("ellipse", P["body"], cx=110, cy=140, rx=86, ry=82))
    # 肚子
    b.append(shape("ellipse", P["belly"], hatch=0.08, cx=110, cy=182, rx=54, ry=38))
    for y, xs in ((170, (90, 110, 130)), (186, (80, 100, 120, 140)), (202, (92, 128))):
        for x in xs:
            b.append(line(f"M{x-5} {y} Q{x} {y+5} {x+5} {y}", width=1.5, opacity=0.5))
    # 臉盤
    b.append(shape("circle", P["face"], hatch=0.06, cx=80, cy=116, r=32))
    b.append(shape("circle", P["face"], hatch=0.06, cx=140, cy=116, r=32))
    # 眼睛（大大的，兩個亮點）
    def sparkle(cx, cy, r):
        b.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{INK}" filter="url(#rough)"/>')
        b.append(f'<circle cx="{cx + r * .35:.1f}" cy="{cy - r * .38:.1f}" r="{r * .36:.1f}" fill="#fff"/>')
        b.append(f'<circle cx="{cx - r * .35:.1f}" cy="{cy + r * .35:.1f}" r="{r * .16:.1f}" fill="#fff"/>')
    if mood == "happy":
        b.append(line("M67 122 Q80 104 93 122", width=5))
        b.append(line("M127 122 Q140 104 153 122", width=5))
    elif mood == "thinking":
        sparkle(87, 108, 12); sparkle(147, 108, 12)
        b.append(line("M64 84 Q80 76 96 82", width=3))
        b.append(line("M124 78 Q140 72 156 80", width=3))
    elif mood == "surprised":
        for cx in (80, 140):
            b.append(f'<circle cx="{cx}" cy="116" r="15" fill="#fff" stroke="{INK}" stroke-width="2" filter="url(#rough)"/>')
            b.append(f'<circle cx="{cx}" cy="116" r="7" fill="{INK}" filter="url(#rough)"/>')
    else:
        sparkle(82, 118, 13); sparkle(138, 118, 13)
    # 眼鏡
    for cx in (80, 140):
        b.append(f'<circle cx="{cx}" cy="116" r="28" fill="none" stroke="{P["glasses"]}" stroke-width="4" filter="url(#rough)"/>')
    b.append(line("M107 112 Q110 105 113 112", width=3.5, color=P["glasses"]))
    # 臉頰
    b.append(f'<ellipse cx="52" cy="148" rx="12" ry="8" fill="{P["cheek"]}" opacity=".6" filter="url(#pencil)"/>')
    b.append(f'<ellipse cx="168" cy="148" rx="12" ry="8" fill="{P["cheek"]}" opacity=".6" filter="url(#pencil)"/>')
    # 嘴
    if mood == "surprised":
        b.append(shape("ellipse", P["beak"], hatch=0, cx=110, cy=146, rx=7, ry=9))
    else:
        b.append(shape("path", P["beak"], hatch=0, d="M101 138 Q110 133 119 138 Q115 150 110 153 Q105 150 101 138 Z"))
    # 思考時：翅膀托著下巴
    if mood == "thinking":
        b.append(shape("ellipse", P["wing"], cx=138, cy=166, rx=12, ry=24, transform="rotate(-64 138 166)"))
    # 獎牌
    b.append(shape("path", P["ribbon_a"], hatch=0.1, stroke=1.8, d="M98 164 L105 164 L112 186 L106 188 Z"))
    b.append(shape("path", P["ribbon_b"], hatch=0.1, stroke=1.8, d="M122 164 L115 164 L108 186 L114 188 Z"))
    b.append(shape("circle", P["medal"], hatch=0.12, cx=110, cy=194, r=12))
    b.append(line("M105 194 L110 189 L115 194 L110 199 Z", width=1.8, opacity=0.7))
    # 腳（小圓腳掌）
    for cx in (86, 134):
        for dx in (-7, 0, 7):
            b.append(shape("circle", P["feet"], hatch=0, stroke=1.6, cx=cx + dx, cy=224, r=6))
    # 心情符號
    if mood == "thinking":
        b.append(line("M186 26 Q194 10 206 22 Q212 34 198 40 L198 50", width=4))
        b.append(f'<circle cx="198" cy="60" r="3" fill="{INK}"/>')
    if mood == "surprised":
        b.append(line("M192 22 L194 50", width=4))
        b.append(f'<circle cx="195" cy="60" r="3" fill="{INK}"/>')
        b.append(line("M208 30 L204 52", width=4))
        b.append(f'<circle cx="203" cy="61" r="3" fill="{INK}"/>')
    if mood == "happy":
        b.append(line("M14 46 L22 54 M22 46 L14 54", width=2.5, color="#e9b949"))
        b.append(line("M200 26 L210 36 M210 26 L200 36", width=2.5, color="#e9b949"))
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


# ---------------------------------------------------------------- 科學家（通用畫法）
SCIENTISTS = {
    # 名稱: 參數。hair：swept 往後梳、side 旁分、bald 禿頂、none
    "laue":     dict(hair="side", hair_color="#4e4038", mustache=True, beard=False, glasses=False, suit="#3f5a6b"),
    "wh-bragg": dict(hair="bald", hair_color="#c9c4bc", mustache=True, beard=False, glasses=False, suit="#5b4a3f", old=True),
    "wl-bragg": dict(hair="side", hair_color="#7a5a3c", mustache=False, beard=False, glasses=False, suit="#4b5f8a"),
    "hounsfield": dict(hair="bald", hair_color="#b9b2a8", mustache=False, beard=False, glasses=False, suit="#55606e", old=True),
    "cormack":  dict(hair="swept", hair_color="#9a948c", mustache=False, beard=False, glasses=True, suit="#6b5a4a"),
}


def draw_scientist(mood, hair="side", hair_color="#5d4e42", mustache=False, beard=False,
                   glasses=False, suit="#4a4e69", old=False):
    P = PALETTE
    b = []
    b.append(shape("path", suit, hatch=0.2, d="M28 238 Q34 170 100 162 Q166 170 172 238 Z"))
    b.append(shape("path", P["shirt"], hatch=0.05, stroke=1.8, d="M82 166 L100 200 L118 166 Z"))
    b.append(shape("path", "#2b2d42", hatch=0, stroke=1.6, d="M94 178 L100 188 L106 178 L100 172 Z"))
    b.append(shape("ellipse", P["skin"], hatch=0, stroke=1.8, cx=60, cy=100, rx=8, ry=12))
    b.append(shape("ellipse", P["skin"], hatch=0, stroke=1.8, cx=140, cy=100, rx=8, ry=12))
    b.append(shape("ellipse", P["skin"], hatch=0.06, cx=100, cy=100, rx=40, ry=50))
    if hair == "side":
        b.append(shape("path", hair_color, hatch=0.25,
                       d="M60 96 Q54 52 92 46 Q138 42 142 92 Q136 70 118 66 Q96 64 84 58 Q70 70 60 96 Z"))
    elif hair == "swept":
        b.append(shape("path", hair_color, hatch=0.25,
                       d="M60 94 Q56 50 100 46 Q144 50 140 94 Q134 70 118 68 Q100 62 82 68 Q66 70 60 94 Z"))
    elif hair == "bald":
        b.append(shape("path", hair_color, hatch=0.25, d="M60 110 Q56 84 66 72 Q70 90 72 108 Z"))
        b.append(shape("path", hair_color, hatch=0.25, d="M140 110 Q144 84 134 72 Q130 90 128 108 Z"))
    if old:
        b.append(line("M80 70 Q100 66 120 70", width=1.6, opacity=0.5))
        b.append(line("M70 108 Q74 114 72 120", width=1.4, opacity=0.4))
        b.append(line("M130 108 Q126 114 128 120", width=1.4, opacity=0.4))
    # 眼睛
    if mood == "happy":
        b.append(line("M76 96 Q84 88 92 96", width=3))
        b.append(line("M108 96 Q116 88 124 96", width=3))
    else:
        b.append(f'<circle cx="84" cy="96" r="4.5" fill="{INK}" filter="url(#rough)"/>')
        b.append(f'<circle cx="116" cy="96" r="4.5" fill="{INK}" filter="url(#rough)"/>')
    brow = hair_color if hair != "bald" else "#8a8178"
    b.append(line("M73 84 Q84 78 94 82", width=3.2, color=brow))
    b.append(line("M106 82 Q116 78 127 84", width=3.2, color=brow))
    if glasses:
        for cx in (84, 116):
            b.append(f'<circle cx="{cx}" cy="96" r="12" fill="none" stroke="{INK}" stroke-width="2.6" filter="url(#rough)"/>')
        b.append(line("M96 95 Q100 92 104 95", width=2.4))
    b.append(line("M100 100 Q96 112 102 114", width=2.2, opacity=0.8))
    if mustache:
        b.append(shape("path", hair_color, hatch=0.2, stroke=1.6,
                       d="M80 124 Q90 114 100 120 Q110 114 120 124 Q110 128 100 124 Q90 128 80 124 Z"))
    mouth = "M88 132 Q100 142 112 132" if mood == "happy" else "M90 134 Q100 138 110 134"
    b.append(line(mouth, width=2.4))
    if beard:
        b.append(shape("path", hair_color, hatch=0.28, d="M64 108 Q66 150 100 164 Q134 150 136 108 Q120 140 100 138 Q80 140 64 108 Z"))
    return svg("0 0 200 240", "\n".join(b), seed=6)


# ---------------------------------------------------------------- 小晶（食鹽晶體）
def draw_crystal(mood):
    """小晶：一顆食鹽（氯化鈉）小方塊。表面點點是排得整整齊齊的原子。"""
    b = []
    top, left, right = "#eef7fb", "#cfe6f2", "#b3d4e6"
    b.append(shape("path", top, hatch=0.06, d="M80 30 L144 58 L80 86 L16 58 Z"))
    b.append(shape("path", left, hatch=0.1, d="M16 58 L80 86 L80 156 L16 128 Z"))
    b.append(shape("path", right, hatch=0.16, d="M80 86 L144 58 L144 128 L80 156 Z"))
    # 原子點點（鈉：小紫點；氯：大綠點，交錯排列）
    for i in range(4):
        for j in range(4):
            x = 16 + (i + 0.5) * 16 + 0
            y = 58 + (i + 0.5) * 7 + (j + 0.5) * 17.5
            big = (i + j) % 2 == 0
            b.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{3.6 if big else 2.4}" fill="{"#6cbf84" if big else "#a77fd6"}" opacity=".7"/>')
    for i in range(4):
        for j in range(4):
            x = 80 + (i + 0.5) * 16
            y = 86 - (i + 0.5) * 7 + (j + 0.5) * 17.5
            big = (i + j) % 2 == 1
            b.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{3.6 if big else 2.4}" fill="{"#6cbf84" if big else "#a77fd6"}" opacity=".7"/>')
    # 臉（畫在左前面）
    if mood == "happy":
        b.append(line("M34 98 Q40 90 46 98", width=3.2))
        b.append(line("M54 106 Q60 98 66 106", width=3.2))
    else:
        b.append(f'<circle cx="40" cy="96" r="5" fill="{INK}"/><circle cx="41.6" cy="94" r="1.7" fill="#fff"/>')
        b.append(f'<circle cx="60" cy="104" r="5" fill="{INK}"/><circle cx="61.6" cy="102" r="1.7" fill="#fff"/>')
    b.append(line("M42 114 Q50 124 60 118", width=2.6))
    b.append(f'<ellipse cx="32" cy="110" rx="5" ry="3.5" fill="{PALETTE["cheek"]}" opacity=".55"/>')
    b.append(f'<ellipse cx="68" cy="124" rx="5" ry="3.5" fill="{PALETTE["cheek"]}" opacity=".55"/>')
    return svg("0 0 160 170", "\n".join(b), seed=9)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = {
        "nuo": (draw_nuo, ["default", "happy", "thinking", "surprised"]),
        "xray": (draw_xray, ["default", "happy"]),
        "rontgen": (draw_rontgen, ["default", "happy"]),
        "crystal": (draw_crystal, ["default", "happy"]),
    }
    for name, params in SCIENTISTS.items():
        jobs[name] = ((lambda p: (lambda mood: draw_scientist(mood, **p)))(params), ["default", "happy"])
    for name, (fn, moods) in jobs.items():
        for mood in moods:
            path = OUT / f"{name}-{mood}.svg"
            path.write_text(fn(mood), encoding="utf-8")
            print("寫入", path.relative_to(OUT.parent.parent.parent))


if __name__ == "__main__":
    main()
