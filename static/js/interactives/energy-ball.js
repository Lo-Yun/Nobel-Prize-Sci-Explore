/* 互動元件：能量地形與滾動的球（2024 霍普菲爾德、辛頓）
 * 每個山谷代表一個記憶。把球放在山坡上，它會滾進最近的山谷，就像網路「想起」最接近的記憶。
 *   L1／L2：拖曳球再放開，看它滾到哪個谷底
 *   L3：加入溫度。球會隨機抖動（Metropolis 取樣），停留在各處的機率符合
 *       波茲曼分布 p(x) ∝ exp(−E(x)/T)；「模擬退火」示範從高溫慢慢降溫，找到最深的谷。 */
NobelIX.register("energy-ball", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var INK = "#3a2e2a";
  var WELLS = [
    { c: 0.18, a: 0.9, s: 0.075, name: L("笑臉", "Smile") },
    { c: 0.50, a: 0.65, s: 0.06, name: L("愛心", "Heart") },
    { c: 0.82, a: 1.2, s: 0.075, name: L("房子", "House") }
  ];
  function E(x) {
    var e = 0.9 * Math.pow(2 * x - 1, 8); // 兩側的牆
    WELLS.forEach(function (w) { e -= w.a * Math.exp(-Math.pow(x - w.c, 2) / (2 * w.s * w.s)); });
    return e;
  }
  function dE(x) { var h = 1e-4; return (E(x + h) - E(x - h)) / (2 * h); }

  var W = 600, Hh = 260, M = { l: 20, r: 20, t: 30, b: 30 };
  var pw = W - M.l - M.r, ph = Hh - M.t - M.b;
  var EMIN = -1.25, EMAX = 0.5;
  function px(x) { return M.l + x * pw; }
  function py(e) { return M.t + (EMAX - e) / (EMAX - EMIN) * ph; }

  var state = { x: 0.36, v: 0, dragging: false, T: level === "L3" ? 0.3 : 0, annealing: false };
  var hist = new Float64Array(60), histN = 0;

  var wrap = H.el("div", {}, stage);
  var svg = H.svg("svg", { viewBox: "0 0 " + W + " " + (level === "L3" ? Hh + 90 : Hh), class: "ix-svg", role: "img",
    "aria-label": L("能量地形：三個山谷代表三個記憶", "Energy landscape with three valleys (memories)"), tabindex: 0, style: "touch-action:none" }, wrap);
  H.sketchDefs(svg, id);
  // 地形
  var d = "", dFill = "";
  for (var k = 0; k <= 300; k++) { var x = k / 300; d += (k ? "L" : "M") + px(x).toFixed(1) + " " + py(E(x)).toFixed(1); }
  dFill = d + " L" + px(1) + " " + (M.t + ph) + " L" + px(0) + " " + (M.t + ph) + " Z";
  H.svg("path", { d: dFill, fill: "#c9a77a", opacity: 0.55, filter: "url(#" + id + "-pencil)" }, svg);
  H.svg("path", { d: d, fill: "none", stroke: INK, "stroke-width": 2.6, filter: "url(#" + id + "-rough)" }, svg);
  WELLS.forEach(function (w) {
    var t = H.svg("text", { x: px(w.c), y: py(E(w.c)) + 22, "text-anchor": "middle", "font-size": 14, style: "font-weight:700" }, svg);
    t.textContent = w.name;
  });
  var yl = H.svg("text", { x: M.l, y: 16, "font-size": 12, opacity: 0.8 }, svg);
  yl.textContent = L("↑ 能量高（不穩定）", "↑ high energy (unstable)");
  var gHist = H.svg("g", {}, svg);
  var ball = H.svg("g", { style: "cursor:grab" }, svg);
  H.svg("circle", { r: 13, fill: "#e9766e", stroke: INK, "stroke-width": 2 }, ball);
  H.svg("circle", { cx: -4, cy: -4, r: 3.5, fill: "#fff", opacity: 0.8 }, ball);

  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0" }, wrap);
  var tInp, tOut;
  if (level === "L3") {
    var lab = H.el("label", {}, ctr);
    H.el("span", { text: L("溫度 T", "Temperature T") }, lab);
    tInp = H.el("input", { type: "range", min: 0.02, max: 1, step: 0.01, value: state.T, id: id + "-T" }, lab);
    tOut = H.el("span", { class: "ix-readout", text: state.T.toFixed(2) }, lab);
    tInp.addEventListener("input", function () { state.T = +tInp.value; tOut.textContent = state.T.toFixed(2); state.annealing = false; resetHist(); });
    var bA = H.el("button", { type: "button", class: "ix-btn", text: L("❄️ 模擬退火", "❄️ Simulated annealing") }, ctr);
    bA.addEventListener("click", function () { state.annealing = true; state.T = 1; state.x = 0.2 + Math.random() * 0.1; resetHist(); });
  } else {
    [[0.05, L("放到左邊山頂", "Drop at left")], [0.34, L("放到中間山坡", "Drop on the middle slope")], [0.66, L("放到右邊山坡", "Drop on the right slope")]].forEach(function (p) {
      var b = H.el("button", { type: "button", class: "ix-btn", text: p[1] }, ctr);
      b.addEventListener("click", function () { state.x = p[0]; state.v = 0; });
    });
  }
  function resetHist() { hist.fill(0); histN = 0; }

  // 拖曳
  function toX(ev) {
    var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var m = svg.getScreenCTM(); if (!m) return state.x;
    return Math.max(0.01, Math.min(0.99, (pt.matrixTransform(m.inverse()).x - M.l) / pw));
  }
  svg.addEventListener("pointerdown", function (e) { state.dragging = true; svg.setPointerCapture(e.pointerId); state.x = toX(e); state.v = 0; });
  svg.addEventListener("pointermove", function (e) { if (state.dragging) { state.x = toX(e); state.v = 0; } });
  svg.addEventListener("pointerup", function () { state.dragging = false; });
  svg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { state.x = Math.max(0.01, state.x - 0.03); state.v = 0; e.preventDefault(); }
    if (e.key === "ArrowRight") { state.x = Math.min(0.99, state.x + 0.03); state.v = 0; e.preventDefault(); }
  });

  function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random()); }
  function tick() {
    if (!state.dragging) {
      if (level === "L3") {
        if (state.annealing) {
          state.T = Math.max(0.02, state.T * 0.992);
          if (tInp) { tInp.value = state.T; tOut.textContent = state.T.toFixed(2); }
          if (state.T <= 0.021) state.annealing = false;
        }
        for (var n = 0; n < 40; n++) { // Metropolis 取樣
          var x2 = state.x + 0.02 * gauss();
          if (x2 <= 0 || x2 >= 1) continue;
          var dEn = E(x2) - E(state.x);
          if (dEn <= 0 || Math.random() < Math.exp(-dEn / state.T)) state.x = x2;
          hist[Math.min(59, Math.floor(state.x * 60))]++; histN++;
        }
      } else {
        // 有阻尼的滾動
        for (var s2 = 0; s2 < 4; s2++) {
          state.v += -dE(state.x) * 0.00012 - state.v * 0.06;
          state.x = Math.max(0.005, Math.min(0.995, state.x + state.v));
        }
      }
    }
    draw();
    requestAnimationFrame(tick);
  }
  function draw() {
    ball.setAttribute("transform", "translate(" + px(state.x) + " " + (py(E(state.x)) - 13) + ")");
    var near = WELLS.reduce(function (a, w) { return Math.abs(w.c - state.x) < Math.abs(a.c - state.x) ? w : a; });
    if (level === "L3") {
      drawHist();
      msg.textContent = state.annealing
        ? L("降溫中… T = ", "Cooling… T = ") + state.T.toFixed(2) + L("。高溫時球可以翻過山頭，溫度慢慢降低後，通常會留在最深的谷（房子）。", ". Hot: the ball hops over hills. Cooled slowly, it usually ends in the deepest valley.")
        : L("長條圖是球停留在各處的次數，曲線是波茲曼分布 exp(−E/T) 的預測。溫度越高，分布越平；溫度越低，球越集中在谷底。溫度太低時，球可能被困在某個山谷裡很久，長條圖就會和曲線不一樣。", "Bars: where the ball spent its time. Curve: Boltzmann prediction exp(−E/T). At low T the ball can stay trapped in one valley for a long time.");
    } else {
      var settled = Math.abs(state.v) < 1e-4 && Math.abs(dE(state.x)) < 0.05;
      msg.textContent = state.dragging
        ? L("放開球，看它會滾到哪裡！", "Let go and see where it rolls!")
        : settled
          ? L("球停在「" + near.name + "」的谷底：網路想起了「" + near.name + "」！", "Settled in the " + near.name + " valley: memory recalled!")
          : L("球一路往低處滾……", "Rolling downhill…");
    }
  }
  function drawHist() {
    gHist.innerHTML = "";
    var top = Hh + 6, hh = 70;
    var maxH = 0; for (var k = 0; k < 60; k++) if (hist[k] > maxH) maxH = hist[k];
    // 理論曲線
    var Z = 0, p = []; for (k = 0; k < 60; k++) { var v = Math.exp(-E((k + 0.5) / 60) / state.T); p.push(v); Z += v; }
    var pMax = Math.max.apply(null, p) / Z;
    var histMax = histN ? maxH / histN : 0;
    var scale = Math.max(pMax, histMax) || 1;
    for (k = 0; k < 60; k++) {
      var h = histN ? hist[k] / histN / scale * hh : 0;
      H.svg("rect", { x: px(k / 60) + 0.5, y: top + hh - h, width: pw / 60 - 1, height: h, fill: "var(--field)", opacity: 0.5 }, gHist);
    }
    var dd = p.map(function (v, k) { return (k ? "L" : "M") + px((k + 0.5) / 60).toFixed(1) + " " + (top + hh - v / Z / scale * hh).toFixed(1); }).join(" ");
    H.svg("path", { d: dd, fill: "none", stroke: "currentColor", "stroke-width": 2 }, gHist);
    H.svg("line", { x1: M.l, y1: top + hh, x2: M.l + pw, y2: top + hh, stroke: "currentColor", opacity: 0.4 }, gHist);
    var t = H.svg("text", { x: M.l, y: top + 10, "font-size": 11, opacity: 0.8 }, gHist);
    t.textContent = L("停留機率", "Occupancy");
  }
  requestAnimationFrame(tick);
});
