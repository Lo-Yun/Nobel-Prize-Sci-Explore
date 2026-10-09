/* 互動元件：霍普菲爾德網路的聯想記憶（2024 霍普菲爾德、辛頓）
 * 10×10 = 100 個神經元，每個只有「亮（+1）」或「暗（−1）」兩種狀態。
 * 用赫布規則 w_ij = (1/N) Σ ξ_i ξ_j 把圖案存進連結強度裡；
 * 回想時，每個神經元依照鄰居的意見 h_i = Σ w_ij s_j 決定要亮還是暗，
 * 網路的能量 E = −½ Σ w_ij s_i s_j 只會下降，最後停在最近的記憶。
 *   L1：選一張圖、塗鴉或加雜訊，按「回想」
 *   L2：可以選擇要記住哪些圖，並顯示能量
 *   L3：加入隨機記憶測試容量（約 0.14N）、溫度（隨機更新），以及重疊度與能量曲線 */
NobelIX.register("hopfield-memory", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var SIDE = 10, N = SIDE * SIDE;
  var PATTERNS = [
    { key: "smile", name: L("笑臉", "Smile"), rows: ["..######..", ".#......#.", "#..#..#..#", "#..#..#..#", "#........#", "#.#....#.#", "#..####..#", ".#......#.", "..######..", ".........."] },
    { key: "heart", name: L("愛心", "Heart"), rows: ["..........", ".##....##.", "####..####", "##########", "##########", ".########.", "..######..", "...####...", "....##....", ".........."] },
    { key: "house", name: L("房子", "House"), rows: ["....##....", "...#..#...", "..#....#..", ".#......#.", "##########", ".#......#.", ".#.##.#.#.", ".#.##.#.#.", ".#....#.#.", ".########."] },
    { key: "note", name: L("音符", "Note"), rows: ["....#####.", "....#####.", "....#...#.", "....#...#.", "....#...#.", "....#...#.", ".###..###.", "####.####.", "####.####.", ".##...##.."] }
  ];
  PATTERNS.forEach(function (p) { p.v = p.rows.join("").split("").map(function (c) { return c === "#" ? 1 : -1; }); });

  var state = {
    stored: { smile: true, heart: true, house: true, note: level !== "L1" ? false : true },
    randomK: 0, T: 0, running: false
  };
  var randomPatterns = [];
  var s = PATTERNS[0].v.slice();
  var W = new Float32Array(N * N);
  var energyTrace = [];

  function memories() {
    var list = PATTERNS.filter(function (p) { return state.stored[p.key]; }).map(function (p) { return p.v; });
    return list.concat(randomPatterns.slice(0, state.randomK));
  }
  function train() {
    W.fill(0);
    memories().forEach(function (p) {
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) if (i !== j) W[i * N + j] += p[i] * p[j] / N;
    });
  }
  function field(i) { var h = 0; for (var j = 0; j < N; j++) h += W[i * N + j] * s[j]; return h; }
  function energy() { var e = 0; for (var i = 0; i < N; i++) e -= 0.5 * s[i] * field(i); return e; }
  function overlap(p) { var m = 0; for (var i = 0; i < N; i++) m += p[i] * s[i]; return m / N; }
  function makeRandom() {
    randomPatterns = [];
    for (var k = 0; k < 30; k++) { var v = []; for (var i = 0; i < N; i++) v.push(Math.random() < 0.5 ? 1 : -1); randomPatterns.push(v); }
  }
  makeRandom();

  // ---------- 版面 ----------
  var wrap = H.el("div", {}, stage);
  var row = H.el("div", { style: "display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start" }, wrap);
  var left = H.el("div", { style: "flex:1 1 260px;min-width:0;max-width:340px" }, row);
  var right = H.el("div", { style: "flex:1 1 220px;min-width:0" }, row);
  var CELL = 30;
  var svg = H.svg("svg", { viewBox: "0 0 " + SIDE * CELL + " " + SIDE * CELL, class: "ix-svg", role: "img",
    "aria-label": L("100 個神經元組成的方格。可以點擊或拖曳來改變它們的狀態。", "A grid of 100 neurons. Click or drag to change them."), style: "cursor:crosshair" }, left);
  var cells = [];
  for (var i = 0; i < N; i++) {
    cells.push(H.svg("rect", { x: (i % SIDE) * CELL + 1.5, y: Math.floor(i / SIDE) * CELL + 1.5, width: CELL - 3, height: CELL - 3, rx: 7,
      stroke: "currentColor", "stroke-opacity": 0.25, "stroke-width": 1 }, svg));
  }
  H.el("p", { text: L("✏️ 直接在格子上點或拖曳，就能塗鴉。", "✏️ Click or drag on the grid to draw."), style: "margin:6px 0 0;font-size:.9em" }, left);

  H.el("p", { text: level === "L1" ? L("網路記住的圖（點一下放到格子上）", "Memories (tap to load)") : L("記憶庫（點圖放到格子上；勾選＝要記住）", "Memory bank (tap to load; tick = stored)"),
    style: "margin:0 0 6px;font-weight:700" }, right);
  var bank = H.el("div", { style: "display:flex;flex-wrap:wrap;gap:10px" }, right);
  var thumbs = PATTERNS.map(function (p) {
    var box = H.el("div", { style: "display:grid;gap:2px;justify-items:center;font-size:.85em" }, bank);
    var b = H.el("button", { type: "button", class: "ix-btn", style: "padding:4px;border-radius:10px", "aria-label": L("放上「", "Load ") + p.name + L("」", "") }, box);
    var t = H.svg("svg", { viewBox: "0 0 50 50", width: 50, height: 50 }, b);
    p.v.forEach(function (v, k) {
      H.svg("rect", { x: (k % SIDE) * 5, y: Math.floor(k / SIDE) * 5, width: 4.6, height: 4.6, fill: v > 0 ? "#e9766e" : "transparent" }, t);
    });
    b.addEventListener("click", function () { stop(); s = p.v.slice(); energyTrace = []; render(); });
    var label;
    if (level === "L1") label = H.el("span", { text: p.name }, box);
    else {
      label = H.el("label", { style: "display:flex;gap:4px;align-items:center" }, box);
      var cb = H.el("input", { type: "checkbox", id: id + "-mem-" + p.key }, label);
      cb.checked = state.stored[p.key];
      H.el("span", { text: p.name }, label);
      cb.addEventListener("change", function () { stop(); state.stored[p.key] = cb.checked; train(); render(); });
    }
    return b;
  });

  var ctr = H.el("div", { class: "ix-controls" }, right);
  var bNoise = H.el("button", { type: "button", class: "ix-btn", text: L("🎲 加一點雜訊", "🎲 Add noise") }, ctr);
  var bClear = H.el("button", { type: "button", class: "ix-btn", text: L("🧽 全部清空", "🧽 Clear") }, ctr);
  var bRun = H.el("button", { type: "button", class: "ix-btn", style: "font-weight:700", text: L("🧠 回想！", "🧠 Recall!") }, ctr);
  bNoise.addEventListener("click", function () { stop(); for (var k = 0; k < N; k++) if (Math.random() < 0.15) s[k] = -s[k]; energyTrace = []; render(); });
  bClear.addEventListener("click", function () { stop(); s.fill(-1); energyTrace = []; render(); });
  bRun.addEventListener("click", function () { if (state.running) stop(); else run(); });

  if (level === "L3") {
    var c3 = H.el("div", { class: "ix-controls" }, right);
    function slider(label, key, min, max, step, fmt, after) {
      var lab = H.el("label", {}, c3);
      H.el("span", { text: label }, lab);
      var inp = H.el("input", { type: "range", min: min, max: max, step: step, value: state[key], id: id + "-" + key }, lab);
      var out = H.el("span", { class: "ix-readout", text: fmt(state[key]) }, lab);
      inp.addEventListener("input", function () { stop(); state[key] = +inp.value; out.textContent = fmt(state[key]); if (after) after(); render(); });
    }
    slider(L("再加入隨機記憶", "Extra random memories"), "randomK", 0, 25, 1, function (v) { return v + L(" 個", ""); }, train);
    slider(L("溫度 T", "Temperature T"), "T", 0, 1, 0.05, function (v) { return v.toFixed(2); });
  }

  var meter = null, meterFill = null, meterTxt = null;
  if (level !== "L1") {
    meter = H.el("div", { style: "margin-top:10px" }, right);
    H.el("div", { text: L("網路有多穩定（能量越低，條越長）", "How settled the network is (lower energy = longer bar)"), style: "font-size:.9em" }, meter);
    var track = H.el("div", { style: "height:14px;border-radius:7px;border:1.5px solid currentColor;overflow:hidden;margin-top:4px" }, meter);
    meterFill = H.el("div", { style: "height:100%;width:50%;background:var(--field);transition:width .1s" }, track);
    meterTxt = H.el("div", { class: "ix-readout", style: "font-size:.9em" }, meter);
  }
  var ovBox = null, chart = null;
  if (level === "L3") {
    ovBox = H.el("div", { style: "margin-top:10px;font-size:.88em;display:grid;gap:3px" }, right);
    H.el("p", { text: L("能量隨更新次數的變化", "Energy vs. updates"), style: "margin:12px 0 2px;font-weight:700" }, wrap);
    chart = H.svg("svg", { viewBox: "0 0 600 150", class: "ix-svg", role: "img", "aria-label": L("能量變化曲線", "Energy curve") }, wrap);
  }
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:10px 0 0" }, wrap);

  // ---------- 塗鴉 ----------
  var painting = false, paintVal = 1;
  function cellAt(ev) {
    var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var m = svg.getScreenCTM(); if (!m) return -1;
    var p = pt.matrixTransform(m.inverse());
    var cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    return cx >= 0 && cx < SIDE && cy >= 0 && cy < SIDE ? cy * SIDE + cx : -1;
  }
  svg.addEventListener("pointerdown", function (e) {
    var c = cellAt(e); if (c < 0) return;
    stop(); painting = true; svg.setPointerCapture(e.pointerId);
    paintVal = -s[c]; s[c] = paintVal; energyTrace = []; render();
  });
  svg.addEventListener("pointermove", function (e) {
    if (!painting) return; var c = cellAt(e);
    if (c >= 0 && s[c] !== paintVal) { s[c] = paintVal; render(); }
  });
  svg.addEventListener("pointerup", function () { painting = false; });

  // ---------- 回想 ----------
  var raf = null, order = [], pos = 0, changed = 0, sweeps = 0, lastIdx = -1;
  function shuffle() { order = []; for (var k = 0; k < N; k++) order.push(k); for (k = N - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)); var t = order[k]; order[k] = order[r]; order[r] = t; } pos = 0; changed = 0; }
  function step() {
    var batch = H.reducedMotion ? N : 5;
    for (var b = 0; b < batch; b++) {
      var i = order[pos++], h = field(i), nv;
      if (state.T > 0) nv = Math.random() < 1 / (1 + Math.exp(-2 * h / state.T)) ? 1 : -1;
      else nv = h > 0 ? 1 : h < 0 ? -1 : s[i];
      if (nv !== s[i]) { s[i] = nv; changed++; }
      lastIdx = i;
      energyTrace.push(energy());
      if (pos >= N) {
        sweeps++;
        if ((state.T === 0 && changed === 0) || sweeps >= (state.T > 0 ? 25 : 40)) { render(); stop(true); return; }
        shuffle();
      }
    }
    render();
    raf = requestAnimationFrame(step);
  }
  function run() {
    if (!memories().length) { msg.textContent = L("記憶庫是空的，先勾選要記住的圖。", "No memories stored yet."); return; }
    state.running = true; bRun.textContent = L("⏸ 暫停", "⏸ Pause");
    sweeps = 0; shuffle(); energyTrace = [energy()];
    raf = requestAnimationFrame(step);
  }
  function stop(finished) {
    if (raf) cancelAnimationFrame(raf); raf = null; lastIdx = -1;
    if (state.running) { state.running = false; bRun.textContent = L("🧠 回想！", "🧠 Recall!"); }
    if (finished) render(true);
  }

  // ---------- 畫面 ----------
  var EMIN = -0.5 * N; // 能量的參考下限（單一記憶時，E ≈ −N/2）
  function render(done) {
    for (var k = 0; k < N; k++) {
      cells[k].setAttribute("fill", s[k] > 0 ? "#e9766e" : "var(--paper)");
      cells[k].setAttribute("stroke-opacity", k === lastIdx ? 1 : 0.25);
      cells[k].setAttribute("stroke-width", k === lastIdx ? 3 : 1);
    }
    var e = energy();
    if (meterFill) {
      var frac = Math.max(0, Math.min(1, e / EMIN)); // E 越低，條越長
      meterFill.style.width = (frac * 100).toFixed(0) + "%";
      meterTxt.textContent = "E = " + e.toFixed(1);
    }
    // 最像哪一個記憶？
    var best = null, bestM = 0, inverted = false;
    PATTERNS.forEach(function (p) {
      if (!state.stored[p.key]) return;
      var m = overlap(p.v);
      if (Math.abs(m) > Math.abs(bestM)) { bestM = m; best = p; }
    });
    if (best) inverted = bestM < 0;
    if (ovBox) {
      ovBox.innerHTML = "";
      H.el("div", { text: L("和每個記憶的重疊度 m（1＝完全相同，−1＝完全相反）", "Overlap m with each memory (1 = same, −1 = inverted)") }, ovBox);
      PATTERNS.forEach(function (p) {
        if (!state.stored[p.key]) return;
        var m = overlap(p.v);
        var r = H.el("div", { style: "display:grid;grid-template-columns:3.5em 1fr 3.5em;gap:6px;align-items:center" }, ovBox);
        H.el("span", { text: p.name }, r);
        var tr = H.el("div", { style: "position:relative;height:10px;border-radius:5px;background:var(--rule)" }, r);
        H.el("div", { style: "position:absolute;top:0;bottom:0;border-radius:5px;background:var(--field);" +
          (m >= 0 ? "left:50%;width:" + (m * 50) + "%" : "right:50%;width:" + (-m * 50) + "%") }, tr);
        H.el("span", { class: "ix-readout", text: m.toFixed(2) }, r);
      });
    }
    if (chart) drawChart();

    var text;
    if (state.running) text = L("小元們正在互相商量，一個一個決定要亮還是暗……", "The neurons are consulting each other, one at a time…");
    else if (done || energyTrace.length) {
      if (best && Math.abs(bestM) > 0.97) {
        text = inverted
          ? L("網路停在「" + best.name + "」的相反圖案！這也是能量谷底：赫布規則記住圖案時，相反的圖案也會一起被記住。", "It settled on the inverse of " + best.name + " — also an energy minimum.")
          : L("想起來了：「" + best.name + "」！", "Recalled: " + best.name + "!");
      } else {
        text = L("網路停在一個「混在一起」的狀態，不是任何一張記住的圖。這叫做假記憶（偽穩態）。", "It got stuck in a mixture state — a spurious memory.");
        if (level === "L3" && state.randomK + 4 > 0.14 * N) text += L("　記憶太多（超過約 0.14N ≈ 14 個）時，網路就會開始混淆。", "　With more than ~0.14N ≈ 14 memories the network starts to fail.");
      }
    } else {
      text = level === "L1"
        ? L("先在格子上亂塗幾筆，或按「加一點雜訊」把圖弄亂，再按「回想！」", "Scribble on the grid or add noise, then press Recall!")
        : L("把圖弄亂之後按「回想」，看能量怎麼一路往下掉。", "Mess up the picture, then press Recall and watch the energy fall.");
    }
    msg.textContent = text;
  }
  function drawChart() {
    chart.innerHTML = "";
    var M = { l: 44, r: 10, t: 10, b: 24 }, pw = 600 - M.l - M.r, ph = 150 - M.t - M.b;
    var g = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, chart);
    H.svg("line", { x1: 0, y1: ph, x2: pw, y2: ph, stroke: "currentColor", opacity: 0.5 }, g);
    var xl = H.svg("text", { x: pw, y: ph + 18, "text-anchor": "end", "font-size": 11, opacity: 0.8 }, g); xl.textContent = L("更新次數", "updates");
    if (energyTrace.length < 2) return;
    var lo = Math.min.apply(null, energyTrace), hi = Math.max.apply(null, energyTrace);
    if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
    var n = energyTrace.length;
    var d = energyTrace.map(function (v, k) { return (k ? "L" : "M") + (k / (n - 1) * pw).toFixed(1) + " " + (ph - (v - lo) / (hi - lo) * ph).toFixed(1); }).join(" ");
    H.svg("path", { d: d, fill: "none", stroke: "var(--field)", "stroke-width": 2 }, g);
    [hi, lo].forEach(function (v) {
      var t = H.svg("text", { x: -6, y: ph - (v - lo) / (hi - lo) * ph + 4, "text-anchor": "end", "font-size": 11 }, g);
      t.textContent = v.toFixed(0);
    });
  }

  train();
  // 開場：一張被弄亂的笑臉
  for (var k0 = 0; k0 < N; k0++) if (Math.random() < 0.15) s[k0] = -s[k0];
  render();
});
