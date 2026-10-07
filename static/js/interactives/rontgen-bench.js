/* 互動元件：倫琴的實驗桌（L2 研究員）
 * 重現 1895 年的關鍵觀察：
 *   1. 陰極射線管包上黑紙板，看不到管子的光，但遠處的螢光幕還是會亮。
 *   2. 在管子和螢光幕之間放不同材料，螢光幕亮度不同。
 *   3. 磁鐵可以讓管內的陰極射線轉彎，卻不能讓 X 光轉彎。
 * 穿透率依倫琴論文描述的材料與厚度，用現代 NIST 數據（約 50 keV 等效能量）估算。 */
NobelIX.register("rontgen-bench", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var INK = "#3a2e2a";
  var MATERIALS = [
    { key: "none", name: L("什麼都不放", "Nothing"), T: 1, note: L("X 光直接打到螢光幕上，最亮。", "X-rays hit the screen directly.") },
    { key: "book", name: L("一千頁的書", "1000-page book"), T: 0.43, color: "#c9a27a",
      note: L("倫琴寫道：隔著一本約一千頁的書，螢光幕依然明亮。紙對 X 光幾乎是透明的。", "Röntgen: behind a bound book of about 1000 pages the screen still lit up brightly.") },
    { key: "wood", name: L("3 公分木板", "3 cm pine board"), T: 0.76, color: "#a8743f",
      note: L("兩三公分厚的松木板，只擋掉一點點。", "Pine boards 2–3 cm thick absorb very little.") },
    { key: "al", name: L("15 毫米鋁板", "15 mm aluminium"), T: 0.23, color: "#b9c3cc",
      note: L("15 毫米厚的鋁板讓光明顯變暗，但沒有完全消失。", "15 mm of aluminium weakened it a lot, but not completely.") },
    { key: "pb", name: L("1.5 毫米鉛片", "1.5 mm lead"), T: 0.0, color: "#6d7480",
      note: L("薄薄 1.5 毫米的鉛片，幾乎完全擋住。原子越重、密度越高，越會擋 X 光。", "Just 1.5 mm of lead is practically opaque.") },
    { key: "hand", name: L("自己的手", "Your own hand"), T: 0.7, color: "#f2c9a0",
      note: L("倫琴在螢光幕上看到自己手骨的影子：肌肉讓 X 光通過，骨頭擋住比較多。", "Röntgen saw the shadow of the bones of his own hand.") }
  ];
  var state = { power: false, cover: true, lights: true, magnet: false, mat: "none" };

  var wrap = H.el("div", {}, stage);
  var svg = H.svg("svg", { viewBox: "0 0 640 300", class: "ix-svg", role: "img",
    "aria-label": L("倫琴實驗桌的模擬圖", "Simulation of Röntgen's bench") }, wrap);
  H.sketchDefs(svg, id);
  var rough = "url(#" + id + "-rough)", pencil = "url(#" + id + "-pencil)";
  var defs = svg.querySelector("defs");
  var gl = H.svg("filter", { id: id + "-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
  gl.innerHTML = '<feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>';

  // 房間背景
  var room = H.svg("rect", { x: 0, y: 0, width: 640, height: 300, rx: 10 }, svg);
  H.svg("rect", { x: 10, y: 236, width: 620, height: 14, rx: 4, fill: "#a8743f", filter: pencil }, svg);
  H.svg("rect", { x: 10, y: 236, width: 620, height: 14, rx: 4, fill: "none", stroke: INK, "stroke-width": 2, filter: rough }, svg);

  // 陰極射線管
  var tube = H.svg("g", { transform: "translate(40 70)" }, svg);
  var glass = H.svg("path", { d: "M10 70 Q10 30 60 30 L120 30 Q190 10 200 70 Q190 130 120 110 L60 110 Q10 110 10 70 Z",
    stroke: INK, "stroke-width": 2.4, filter: rough }, tube);
  H.svg("rect", { x: -12, y: 62, width: 24, height: 16, rx: 3, fill: "#8a8f99", stroke: INK, "stroke-width": 1.8 }, tube);
  H.svg("rect", { x: 96, y: 6, width: 10, height: 30, rx: 2, fill: "#8a8f99", stroke: INK, "stroke-width": 1.8 }, tube);
  var beam = H.svg("path", { d: "M14 70 L190 70", stroke: "#7cd1ff", "stroke-width": 5, "stroke-dasharray": "10 10", fill: "none", "stroke-linecap": "round" }, tube);
  var hit = H.svg("circle", { cx: 192, cy: 70, r: 9, fill: "#b8ff8a", filter: "url(#" + id + "-glow)" }, tube);
  var cover = H.svg("rect", { x: -18, y: 0, width: 232, height: 140, rx: 8, fill: "#1d1b1a", stroke: INK, "stroke-width": 2.4, filter: rough }, tube);
  var coverLabel = H.svg("text", { x: 98, y: 76, "text-anchor": "middle", "font-size": 14, fill: "#f7f5ee", style: "fill:#f7f5ee" }, tube);
  coverLabel.textContent = L("黑紙板", "Black cardboard");

  // 磁鐵
  var magnet = H.svg("g", { transform: "translate(150 150)" }, svg);
  H.svg("path", { d: "M0 0 L0 40 Q0 60 20 60 Q40 60 40 40 L40 0 L28 0 L28 40 Q28 48 20 48 Q12 48 12 40 L12 0 Z", fill: "#d9534f", stroke: INK, "stroke-width": 2, filter: rough }, magnet);
  H.svg("rect", { x: 0, y: 0, width: 12, height: 10, fill: "#dfe3e8", stroke: INK, "stroke-width": 1.5 }, magnet);
  H.svg("rect", { x: 28, y: 0, width: 12, height: 10, fill: "#dfe3e8", stroke: INK, "stroke-width": 1.5 }, magnet);

  // X 光路徑（看不見，用虛線表示）
  var xpath = H.svg("g", {}, svg);
  [100, 140, 180].forEach(function (y) {
    H.svg("line", { x1: 250, y1: 140, x2: 520, y2: y, stroke: "#b9a4ff", "stroke-width": 2, "stroke-dasharray": "3 7", opacity: 0.8 }, xpath);
  });
  // 材料
  var slab = H.svg("g", {}, svg);
  // 螢光幕
  var screenG = H.svg("g", { transform: "translate(520 60)" }, svg);
  H.svg("rect", { x: 0, y: 0, width: 26, height: 160, rx: 4, fill: "#e8e4d6", stroke: INK, "stroke-width": 2.4, filter: rough }, screenG);
  var screenGlow = H.svg("rect", { x: 2, y: 2, width: 22, height: 156, rx: 3, fill: "#b8ff5a", opacity: 0, filter: "url(#" + id + "-glow)" }, screenG);
  var bones = H.svg("g", { opacity: 0 }, screenG);
  [[8, 48, 8, 70], [13, 40, 13, 70], [18, 46, 18, 72], [10, 78, 12, 112], [16, 78, 15, 112]].forEach(function (b) {
    H.svg("line", { x1: b[0], y1: b[1], x2: b[2], y2: b[3], stroke: "#3c5a2a", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.85 }, bones);
  });
  H.svg("line", { x1: 560, y1: 236, x2: 533, y2: 220, stroke: INK, "stroke-width": 3 }, svg);
  var screenLabel = H.svg("text", { x: 533, y: 50, "text-anchor": "middle", "font-size": 13 }, svg);
  screenLabel.textContent = L("螢光幕", "Screen");
  var tubeLabel = H.svg("text", { x: 140, y: 230, "text-anchor": "middle", "font-size": 13 }, svg);
  tubeLabel.textContent = L("陰極射線管", "Cathode-ray tube");

  // 控制列
  var c1 = H.el("div", { class: "ix-controls" }, wrap);
  function toggle(label, key) {
    var b = H.el("button", { type: "button", class: "ix-btn", text: label }, c1);
    b.addEventListener("click", function () { state[key] = !state[key]; render(); });
    return function () { b.setAttribute("aria-pressed", String(!!(key === "lights" ? !state.lights : state[key]))); };
  }
  var syncs = [
    toggle(L("⚡ 通電", "⚡ Power"), "power"),
    toggle(L("包上黑紙板", "Cardboard cover"), "cover"),
    toggle(L("🌙 關燈", "🌙 Lights off"), "lights"),
    toggle(L("🧲 拿磁鐵靠近", "🧲 Bring a magnet"), "magnet")
  ];
  var c2 = H.el("div", { class: "ix-controls", role: "group", "aria-label": L("放在中間的東西", "Object in the path") }, wrap);
  H.el("span", { text: L("中間放：", "In between: ") }, c2);
  var matBtns = MATERIALS.map(function (m) {
    var b = H.el("button", { type: "button", class: "ix-btn", text: m.name }, c2);
    b.addEventListener("click", function () { state.mat = m.key; render(); });
    return b;
  });
  var readout = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:10px 0 0" }, wrap);
  var note = H.el("p", { style: "margin:4px 0 0;font-size:.95em" }, wrap);

  var dash = 0, raf = null;
  function animate() {
    dash = (dash - 2) % 20; beam.setAttribute("stroke-dashoffset", dash);
    raf = state.power && !H.reducedMotion ? requestAnimationFrame(animate) : null;
  }

  function render() {
    var m = MATERIALS.find(function (x) { return x.key === state.mat; });
    var dark = !state.lights;
    var cs = getComputedStyle(stage);
    room.setAttribute("fill", dark ? "#15171c" : "transparent");
    glass.setAttribute("fill", state.power && !state.cover ? "rgba(170,255,140,.35)" : "rgba(220,235,245,.55)");
    beam.style.display = state.power ? "" : "none";
    hit.style.display = state.power ? "" : "none";
    // 磁鐵讓陰極射線轉彎（射線是帶電的電子）
    beam.setAttribute("d", state.magnet ? "M14 70 Q120 70 176 108" : "M14 70 L190 70");
    hit.setAttribute("cx", state.magnet ? 176 : 192); hit.setAttribute("cy", state.magnet ? 106 : 70);
    magnet.style.display = state.magnet ? "" : "none";
    cover.style.display = state.cover ? "" : "none";
    coverLabel.style.display = state.cover ? "" : "none";
    xpath.style.display = state.power ? "" : "none";
    [screenLabel, tubeLabel].forEach(function (t) { t.style.fill = dark ? "#e8e4d6" : ""; });

    slab.innerHTML = "";
    if (m.key === "hand") {
      H.svg("path", { d: "M380 230 L380 150 Q380 120 392 112 L392 84 Q392 74 400 74 Q408 74 408 84 L408 110 L410 70 Q410 60 418 60 Q426 60 426 70 L426 110 L428 78 Q428 68 436 68 Q444 68 444 78 L444 150 Q444 200 430 230 Z",
        fill: m.color, opacity: 0.7 }, slab);
      H.svg("path", { d: "M380 230 L380 150 Q380 120 392 112 L392 84 Q392 74 400 74 Q408 74 408 84 L408 110 L410 70 Q410 60 418 60 Q426 60 426 70 L426 110 L428 78 Q428 68 436 68 Q444 68 444 78 L444 150 Q444 200 430 230 Z",
        fill: m.color, filter: pencil }, slab);
      H.svg("path", { d: "M380 230 L380 150 Q380 120 392 112 L392 84 Q392 74 400 74 Q408 74 408 84 L408 110 L410 70 Q410 60 418 60 Q426 60 426 70 L426 110 L428 78 Q428 68 436 68 Q444 68 444 78 L444 150 Q444 200 430 230 Z",
        fill: "none", stroke: INK, "stroke-width": 2.2, filter: rough }, slab);
    } else if (m.key !== "none") {
      var w = { book: 46, wood: 26, al: 14, pb: 8 }[m.key];
      H.svg("rect", { x: 400 - w / 2, y: 92, width: w, height: 132, rx: 3, fill: m.color, opacity: 0.75 }, slab);
      H.svg("rect", { x: 400 - w / 2, y: 92, width: w, height: 132, rx: 3, fill: m.color, filter: pencil }, slab);
      H.svg("rect", { x: 400 - w / 2, y: 92, width: w, height: 132, rx: 3, fill: "none", stroke: INK, "stroke-width": 2.2, filter: rough }, slab);
    }

    var on = state.power ? m.T : 0;
    var vis = on * (dark ? 1 : 0.35); // 開燈時微弱的螢光不容易看出來
    screenGlow.setAttribute("opacity", vis.toFixed(2));
    bones.setAttribute("opacity", state.power && m.key === "hand" ? (dark ? 0.9 : 0.4) : 0);

    syncs.forEach(function (f) { f(); });
    matBtns.forEach(function (b, i) { b.setAttribute("aria-pressed", String(MATERIALS[i].key === state.mat)); });

    var msg;
    if (!state.power) msg = L("先按「通電」打開陰極射線管。", "Switch on the tube first.");
    else if (state.lights) msg = L("螢光很微弱，試著把燈關掉。（倫琴就是在暗房裡發現的）", "The glow is faint. Try turning off the lights.");
    else msg = L("螢光幕亮度：", "Screen brightness: ") + Math.round(on * 100) + "%";
    if (state.power && state.cover && !state.lights) msg += L("　管子被黑紙板包住了，光照不出來，螢光幕卻在發亮！", " — the tube is covered, yet the screen glows!");
    readout.textContent = msg;
    var extra = state.magnet && state.power
      ? L("磁鐵讓管子裡的陰極射線轉彎了，但螢光幕的亮度沒有改變：從管子跑出來的新射線不受磁鐵影響。", "The magnet bends the cathode rays inside the tube, but the screen does not change: the new rays ignore the magnet.")
      : "";
    note.textContent = (state.power ? m.note : "") + (extra ? " " + extra : "");
    if (state.power && !raf) animate();
  }
  render();
});
