/* 互動元件：X 光透視鏡（L1 探險家）
 * 拖曳放大鏡，鏡片裡會看到 X 光的樣子。每個場景都有藏起來的東西可以找。 */
NobelIX.register("xray-lens", function (stage, H, id) {
  var T = {
    hint: { "zh-TW": "拖曳（或用方向鍵移動）透視鏡，看看裡面藏了什麼！", en: "Drag the lens (or use arrow keys) to see inside!" },
    found: { "zh-TW": "找到了", en: "Found" },
    all: { "zh-TW": "全部找到了！金屬和骨頭最會擋住 X 光，所以看起來最亮。", en: "All found! Metal and bone block X-rays the most, so they look brightest." },
    scenes: {
      hand: { "zh-TW": "手", en: "Hand" },
      bag: { "zh-TW": "書包", en: "Backpack" },
      nuo: { "zh-TW": "小諾", en: "Nuo" }
    }
  };
  var W = 600, Hh = 380, R = 74;
  var SKIN = "#f2c9a0", INK = "#3a2e2a", BONE = "#eef5ff", XBG = "#0e1c33", SOFT = "#2c4a72";

  var wrap = H.el("div", { class: "xl" }, stage);
  var bar = H.el("div", { class: "ix-controls", role: "group" }, wrap);
  var svg = H.svg("svg", { viewBox: "0 0 " + W + " " + Hh, class: "ix-svg", tabindex: "0",
    role: "img", "aria-label": H.t(T.hint) }, wrap);
  H.sketchDefs(svg, id);
  var defs = svg.querySelector("defs");
  var clip = H.svg("clipPath", { id: id + "-clip" }, defs);
  var clipCircle = H.svg("circle", { cx: 300, cy: 190, r: R }, clip);
  var glow = H.svg("filter", { id: id + "-glow", x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs);
  glow.innerHTML = '<feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>';

  var normal = H.svg("g", {}, svg);
  var xray = H.svg("g", { "clip-path": "url(#" + id + "-clip)" }, svg);
  var lens = H.svg("g", { "pointer-events": "none" }, svg);
  var status = H.el("p", { class: "ix-readout", "aria-live": "polite" }, wrap);
  H.el("p", { class: "xl__hint", text: H.t(T.hint), style: "margin:4px 0 0;font-size:.9em;opacity:.8" }, wrap);

  var rough = "url(#" + id + "-rough)", pencil = "url(#" + id + "-pencil)";
  function shape(tag, attrs, color, parent) {
    if (color !== "none") H.svg(tag, Object.assign({}, attrs, { fill: color, opacity: 0.55 }), parent);
    var a = Object.assign({}, attrs, { fill: color, filter: pencil });
    H.svg(tag, a, parent);
    var o = Object.assign({}, attrs, { fill: "none", stroke: INK, "stroke-width": 2.4, "stroke-linejoin": "round", filter: rough });
    return H.svg(tag, o, parent);
  }
  function bone(g, x1, y1, x2, y2, w) {
    H.svg("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: BONE, "stroke-width": w, "stroke-linecap": "round" }, g);
    H.svg("circle", { cx: x1, cy: y1, r: w * 0.62, fill: BONE }, g);
    H.svg("circle", { cx: x2, cy: y2, r: w * 0.62, fill: BONE }, g);
  }
  function xbg(g) { H.svg("rect", { x: 0, y: 0, width: W, height: Hh, fill: XBG }, g); }

  /* ---------- 場景：手 ---------- */
  var fingers = [ // x, 指尖 y, 寬
    [250, 90, 28], [287, 64, 30], [324, 74, 30], [358, 112, 24]
  ];
  function handPath() {
    var d = "M262 380 L258 318 Q236 296 206 266 L176 236 Q160 220 172 208 Q184 198 198 212 L236 246";
    fingers.forEach(function (f, i) {
      var x0 = f[0] - f[2] / 2, x1 = f[0] + f[2] / 2, top = f[1];
      d += " L" + x0 + " " + (i === 0 ? 200 : 196) + " L" + x0 + " " + (top + f[2] / 2) +
        " Q" + x0 + " " + top + " " + f[0] + " " + top + " Q" + x1 + " " + top + " " + x1 + " " + (top + f[2] / 2) +
        " L" + x1 + " 196";
    });
    return d + " L372 220 Q382 280 368 320 L352 380 Z";
  }
  function handOutline(g, color, stroke) {
    if (stroke) shape("path", { d: handPath() }, color, g);
    else H.svg("path", { d: handPath(), fill: color }, g);
  }
  function drawHand() {
    handOutline(normal, SKIN, true);
    // 指甲
    fingers.forEach(function (f) { H.svg("ellipse", { cx: f[0], cy: f[1] + 14, rx: f[2] * 0.28, ry: 8, fill: "#f7dcc4", stroke: INK, "stroke-width": 1.2, filter: rough }, normal); });
    // 戒指（倫琴夫人手上的那一枚）
    H.svg("rect", { x: 307, y: 166, width: 34, height: 10, rx: 4, fill: "#e9b949", stroke: INK, "stroke-width": 2, filter: rough }, normal);

    xbg(xray);
    var soft = H.svg("g", { opacity: 0.9 }, xray);
    handOutline(soft, SOFT, false);
    var b = H.svg("g", { filter: "url(#" + id + "-glow)" }, xray);
    fingers.forEach(function (f, i) {
      var x = f[0], top = f[1] + 12, w = f[2] * 0.36;
      var len = (200 - top);
      var j1 = top + len * 0.28, j2 = top + len * 0.58;
      bone(b, x, top, x, j1 - 6, w * 0.85);
      bone(b, x, j1 + 4, x, j2 - 6, w);
      bone(b, x, j2 + 4, x, 196, w * 1.05);
      bone(b, x - (1.5 - i) * 4, 210, x - (1.5 - i) * 9, 300, w * 1.05); // 掌骨
    });
    // 拇指
    bone(b, 178, 216, 192, 232, 9); bone(b, 198, 240, 216, 260, 10); bone(b, 222, 266, 250, 300, 11);
    // 腕骨
    [[260, 316], [282, 312], [304, 314], [326, 318], [270, 334], [294, 332], [318, 336], [340, 330]].forEach(function (c) {
      H.svg("circle", { cx: c[0], cy: c[1], r: 9, fill: BONE }, b);
    });
    // 橈骨、尺骨
    bone(b, 282, 352, 278, 400, 22); bone(b, 330, 352, 334, 400, 16);
    // 金屬戒指：完全擋住 X 光
    H.svg("rect", { x: 307, y: 166, width: 34, height: 10, rx: 4, fill: "#ffffff", filter: "url(#" + id + "-glow)" }, xray);
    return [
      { x: 324, y: 171, label: { "zh-TW": "戒指", en: "Ring" } },
      { x: 287, y: 110, label: { "zh-TW": "指骨", en: "Finger bones" } },
      { x: 300, y: 325, label: { "zh-TW": "腕骨", en: "Wrist bones" } }
    ];
  }

  /* ---------- 場景：書包 ---------- */
  function drawBag() {
    shape("rect", { x: 150, y: 60, width: 300, height: 300, rx: 46 }, "#4f8ac9", normal);
    shape("path", { d: "M150 140 Q300 200 450 140 L450 110 Q450 60 400 60 L200 60 Q150 60 150 110 Z" }, "#3d6fa8", normal);
    shape("rect", { x: 200, y: 250, width: 200, height: 90, rx: 22 }, "#f2b33d", normal);
    shape("rect", { x: 270, y: 20, width: 60, height: 50, rx: 24 }, "none", normal);
    H.svg("circle", { cx: 300, cy: 172, r: 9, fill: "#e9b949", stroke: INK, "stroke-width": 2, filter: rough }, normal);

    xbg(xray);
    var soft = H.svg("g", { fill: "none", stroke: SOFT, "stroke-width": 4 }, xray);
    H.svg("rect", { x: 150, y: 60, width: 300, height: 300, rx: 46 }, soft);
    // 課本（紙張：只有一點點擋住）
    H.svg("rect", { x: 180, y: 160, width: 120, height: 160, rx: 6, fill: "#3b5f8f" }, xray);
    H.svg("rect", { x: 186, y: 166, width: 108, height: 148, rx: 4, fill: "none", stroke: "#56789f", "stroke-width": 2 }, xray);
    // 蘋果（水分多：淡淡的）
    H.svg("circle", { cx: 380, cy: 290, r: 34, fill: "#3e6797" }, xray);
    var m = H.svg("g", { filter: "url(#" + id + "-glow)", fill: "#ffffff", stroke: "#ffffff" }, xray);
    // 鑰匙
    H.svg("circle", { cx: 360, cy: 140, r: 14, fill: "none", "stroke-width": 7 }, m);
    H.svg("path", { d: "M374 140 L420 140 M408 140 L408 152 M418 140 L418 150", fill: "none", "stroke-width": 6, "stroke-linecap": "round" }, m);
    // 剪刀
    H.svg("circle", { cx: 230, cy: 110, r: 12, fill: "none", "stroke-width": 5 }, m);
    H.svg("circle", { cx: 262, cy: 110, r: 12, fill: "none", "stroke-width": 5 }, m);
    H.svg("path", { d: "M238 120 L300 190 M254 120 L196 190", fill: "none", "stroke-width": 5, "stroke-linecap": "round" }, m);
    // 硬幣
    [[340, 220], [362, 230], [350, 246]].forEach(function (c) { H.svg("circle", { cx: c[0], cy: c[1], r: 11, stroke: "none" }, m); });
    // 拉鍊頭
    H.svg("circle", { cx: 300, cy: 172, r: 9, stroke: "none" }, m);
    return [
      { x: 395, y: 142, label: { "zh-TW": "鑰匙", en: "Key" } },
      { x: 246, y: 140, label: { "zh-TW": "剪刀", en: "Scissors" } },
      { x: 350, y: 232, label: { "zh-TW": "硬幣", en: "Coins" } },
      { x: 240, y: 240, label: { "zh-TW": "課本", en: "Book" } }
    ];
  }

  /* ---------- 場景：小諾 ---------- */
  function drawNuo() {
    var S = 1.45, OX = 300 - 110 * S, OY = 20;
    H.svg("image", { href: (window.SITE && SITE.root || "") + "static/img/characters/nuo-default.svg",
      x: OX, y: OY, width: 220 * S, height: 240 * S }, normal);
    xbg(xray);
    var g = H.svg("g", { transform: "translate(" + OX + " " + OY + ") scale(" + S + ")" }, xray);
    H.svg("ellipse", { cx: 110, cy: 144, rx: 72, ry: 82, fill: SOFT }, g);
    H.svg("path", { d: "M54 74 L66 22 L98 60 Z M166 74 L154 22 L122 60 Z", fill: SOFT }, g);
    var b = H.svg("g", { filter: "url(#" + id + "-glow)" }, g);
    // 頭骨與大眼窩
    H.svg("ellipse", { cx: 110, cy: 104, rx: 52, ry: 40, fill: BONE, "fill-opacity": 0.55 }, b);
    H.svg("circle", { cx: 84, cy: 108, r: 19, fill: XBG }, b);
    H.svg("circle", { cx: 136, cy: 108, r: 19, fill: XBG }, b);
    H.svg("path", { d: "M104 128 L116 128 L110 146 Z", fill: BONE }, b);
    // 脊椎與肋骨
    for (var i = 0; i < 6; i++) H.svg("rect", { x: 104, y: 150 + i * 11, width: 12, height: 8, rx: 3, fill: BONE }, b);
    for (var k = 0; k < 4; k++) {
      H.svg("path", { d: "M106 " + (156 + k * 12) + " Q" + (78 - k * 2) + " " + (160 + k * 12) + " " + (70 + k * 4) + " " + (176 + k * 12), fill: "none", stroke: BONE, "stroke-width": 4, "stroke-linecap": "round" }, b);
      H.svg("path", { d: "M114 " + (156 + k * 12) + " Q" + (142 + k * 2) + " " + (160 + k * 12) + " " + (150 - k * 4) + " " + (176 + k * 12), fill: "none", stroke: BONE, "stroke-width": 4, "stroke-linecap": "round" }, b);
    }
    // 翅膀骨頭
    H.svg("path", { d: "M58 150 L40 176 L36 196 M40 176 L48 198", fill: "none", stroke: BONE, "stroke-width": 5, "stroke-linecap": "round" }, b);
    H.svg("path", { d: "M162 150 L180 120 L196 92 M180 120 L200 112", fill: "none", stroke: BONE, "stroke-width": 5, "stroke-linecap": "round" }, b);
    // 腳
    H.svg("path", { d: "M96 208 L90 226 M124 208 L130 226", fill: "none", stroke: BONE, "stroke-width": 5, "stroke-linecap": "round" }, b);
    // 金屬：眼鏡和獎牌
    var m = H.svg("g", { filter: "url(#" + id + "-glow)" }, g);
    H.svg("circle", { cx: 84, cy: 112, r: 25, fill: "none", stroke: "#fff", "stroke-width": 4.5 }, m);
    H.svg("circle", { cx: 136, cy: 112, r: 25, fill: "none", stroke: "#fff", "stroke-width": 4.5 }, m);
    H.svg("circle", { cx: 110, cy: 204, r: 13, fill: "#fff" }, m);
    function tp(x, y) { return { x: OX + x * S, y: OY + y * S }; }
    return [
      Object.assign(tp(110, 100), { label: { "zh-TW": "頭骨", en: "Skull" } }),
      Object.assign(tp(84, 140), { label: { "zh-TW": "金屬眼鏡", en: "Metal glasses" } }),
      Object.assign(tp(110, 204), { label: { "zh-TW": "獎牌", en: "Medal" } }),
      Object.assign(tp(110, 175), { label: { "zh-TW": "肋骨", en: "Ribs" } })
    ];
  }

  /* ---------- 放大鏡 ---------- */
  H.svg("circle", { r: R, fill: "none", stroke: "#2e4a7d", "stroke-width": 9 }, lens);
  H.svg("circle", { r: R + 4.5, fill: "none", stroke: INK, "stroke-width": 2, filter: rough }, lens);
  H.svg("line", { x1: R * 0.72, y1: R * 0.72, x2: R * 1.35, y2: R * 1.35, stroke: "#8a5a3c", "stroke-width": 16, "stroke-linecap": "round" }, lens);
  H.svg("line", { x1: R * 0.72, y1: R * 0.72, x2: R * 1.35, y2: R * 1.35, stroke: INK, "stroke-width": 2, filter: rough, "stroke-linecap": "round" }, lens);
  H.svg("path", { d: "M" + (-R * 0.55) + " " + (-R * 0.3) + " A" + R * 0.62 + " " + R * 0.62 + " 0 0 1 " + (-R * 0.15) + " " + (-R * 0.62), fill: "none", stroke: "#fff", "stroke-width": 4, opacity: 0.6, "stroke-linecap": "round" }, lens);

  var targets = [], found = {}, pos = { x: 300, y: 190 };
  function moveTo(x, y) {
    pos.x = Math.max(0, Math.min(W, x)); pos.y = Math.max(0, Math.min(Hh, y));
    clipCircle.setAttribute("cx", pos.x); clipCircle.setAttribute("cy", pos.y);
    lens.setAttribute("transform", "translate(" + pos.x + " " + pos.y + ")");
    targets.forEach(function (t, i) {
      if (!found[i] && Math.hypot(t.x - pos.x, t.y - pos.y) < R * 0.55) { found[i] = true; renderStatus(); }
    });
  }
  function renderStatus() {
    var names = targets.map(function (t, i) { return (found[i] ? "✓ " : "？ ") + (found[i] ? H.t(t.label) : "＿＿"); });
    var n = Object.keys(found).length;
    status.textContent = H.t(T.found) + " " + n + " / " + targets.length + "　" + names.join("　");
    if (n === targets.length) status.textContent += "　" + H.t(T.all);
  }
  var scenes = { hand: drawHand, bag: drawBag, nuo: drawNuo };
  var buttons = {};
  function setScene(name) {
    normal.innerHTML = ""; xray.innerHTML = "";
    targets = scenes[name](); found = {};
    Object.keys(buttons).forEach(function (k) { buttons[k].setAttribute("aria-pressed", String(k === name)); });
    renderStatus(); moveTo(pos.x, pos.y);
  }
  Object.keys(scenes).forEach(function (k) {
    var b = H.el("button", { type: "button", class: "ix-btn", text: H.t(T.scenes[k]) }, bar);
    b.addEventListener("click", function () { setScene(k); });
    buttons[k] = b;
  });

  function toLocal(ev) {
    var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var m = svg.getScreenCTM(); if (!m) return pos;
    return pt.matrixTransform(m.inverse());
  }
  var dragging = false;
  svg.addEventListener("pointerdown", function (e) { dragging = true; svg.setPointerCapture(e.pointerId); var p = toLocal(e); moveTo(p.x, p.y); });
  svg.addEventListener("pointermove", function (e) { if (dragging || e.pointerType === "mouse") { var p = toLocal(e); moveTo(p.x, p.y); } });
  svg.addEventListener("pointerup", function () { dragging = false; });
  svg.addEventListener("keydown", function (e) {
    var d = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
    if (d) { e.preventDefault(); moveTo(pos.x + d[0], pos.y + d[1]); }
  });
  svg.style.cursor = "none";
  setScene("hand");
  moveTo(300, 150);
});
