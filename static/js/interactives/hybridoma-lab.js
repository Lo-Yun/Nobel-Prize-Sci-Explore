/* 互動元件：融合瘤實驗室（1984 科勒、米爾斯坦）
 * 步驟：免疫小鼠 → 取出脾臟的 B 細胞（會做抗體，但活不久）→ 加入骨髓瘤細胞（長生不死，但不會做抗體，
 * 而且在 HAT 培養液中活不下去）→ 融合 → HAT 篩選（只剩融合瘤）→ 分到小格子 → 檢測 → 選殖。
 *   L1／L2：一步一步操作
 *   L3：加上「極限稀釋」：每格平均放 λ 個細胞，用卜瓦松分布計算一格只有單一株細胞的機率 */
NobelIX.register("hybridoma-lab", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var COLORS = ["#e0663a", "#3d6fb6", "#8a5cc4", "#2e8b57", "#d4a017", "#c2417a"];
  var TARGET = 0; // 只有橘色 B 細胞做出能辨認目標（病毒）的抗體
  var steps = [
    { key: "immunize", btn: L("① 替小鼠打疫苗，取出 B 細胞", "① Immunize a mouse, collect B cells") },
    { key: "myeloma", btn: L("② 加入骨髓瘤細胞", "② Add myeloma cells") },
    { key: "fuse", btn: L("③ 讓細胞融合", "③ Fuse the cells") },
    { key: "hat", btn: L("④ 放進 HAT 培養液", "④ Grow in HAT medium") },
    { key: "plate", btn: L("⑤ 分到小格子裡培養", "⑤ Split into wells") },
    { key: "screen", btn: L("⑥ 檢測哪一格會抓病毒", "⑥ Test the wells") }
  ];
  var step = 0, cells = [], wells = [], lambda = level === "L3" ? 0.7 : 1;

  var wrap = H.el("div", {}, stage);
  var svg = H.svg("svg", { viewBox: "0 0 600 300", class: "ix-svg", role: "img", "aria-label": L("培養皿與 24 格培養盤", "Dish and 24-well plate") }, wrap);
  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  var bNext = H.el("button", { type: "button", class: "ix-btn", style: "font-weight:700" }, ctr);
  var bReset = H.el("button", { type: "button", class: "ix-btn", text: L("↺ 從頭再做一次", "↺ Start over") }, ctr);
  var lamOut;
  if (level === "L3") {
    var lab = H.el("label", {}, ctr);
    H.el("span", { text: L("每格平均細胞數 λ", "Mean cells per well λ") }, lab);
    var inp = H.el("input", { type: "range", min: 0.2, max: 3, step: 0.1, value: lambda, id: id + "-lambda" }, lab);
    lamOut = H.el("span", { class: "ix-readout", text: lambda.toFixed(1) }, lab);
    inp.addEventListener("input", function () { lambda = +inp.value; lamOut.textContent = lambda.toFixed(1); if (step >= 5) { plate(); if (step >= 6) screen(); } draw(); });
  }
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0;line-height:1.7" }, wrap);

  function rand(a, b) { return a + Math.random() * (b - a); }
  function reset() { step = 0; cells = []; wells = []; draw(); }
  function doStep() {
    var k = steps[step].key;
    if (k === "immunize") for (var i = 0; i < 30; i++) cells.push({ kind: "B", color: i < 10 ? TARGET : 1 + Math.floor(Math.random() * 5), x: rand(30, 270), y: rand(40, 270) });
    if (k === "myeloma") for (i = 0; i < 30; i++) cells.push({ kind: "M", x: rand(30, 270), y: rand(40, 270) });
    if (k === "fuse") {
      var pool = cells.slice().sort(function () { return Math.random() - 0.5; }), out = [];
      while (pool.length) {
        var a = pool.pop();
        if (pool.length && Math.random() < 0.5) {
          var b = pool.pop(), kinds = a.kind + b.kind;
          if (kinds === "BM" || kinds === "MB") out.push({ kind: "H", color: a.kind === "B" ? a.color : b.color, x: a.x, y: a.y });
          else out.push({ kind: kinds === "BB" ? "BB" : "MM", color: a.color, x: a.x, y: a.y });
        } else out.push(a);
      }
      cells = out;
    }
    if (k === "hat") {
      cells = cells.filter(function (c) { return c.kind === "H"; });
      var grown = [];
      cells.forEach(function (c) { grown.push(c); grown.push({ kind: "H", color: c.color, x: Math.min(270, c.x + rand(-12, 12)), y: Math.min(270, Math.max(40, c.y + rand(-12, 12))) }); });
      cells = grown;
    }
    if (k === "plate") plate();
    if (k === "screen") screen();
    step++;
    draw();
  }
  function poisson(l) { var Lm = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > Lm); return k - 1; }
  function plate() {
    // 融合瘤的「株」：每一顆原始融合瘤都是一個株（同一個顏色可能來自不同的 B 細胞，這裡用編號區分）
    var clones = cells.filter(function (c, i) { return i % 2 === 0; }).map(function (c, i) { return { color: c.color, id: i }; });
    wells = [];
    for (var w = 0; w < 24; w++) {
      var n = poisson(lambda), content = [];
      for (var j = 0; j < n; j++) content.push(clones[Math.floor(Math.random() * clones.length)]);
      wells.push({ content: content, tested: false });
    }
  }
  function screen() { wells.forEach(function (w) { w.tested = true; }); }

  function draw() {
    svg.innerHTML = "";
    // 培養皿
    H.svg("circle", { cx: 150, cy: 155, r: 135, fill: "#eef5f3", stroke: "#3a2e2a", "stroke-width": 2 }, svg);
    var tt = H.svg("text", { x: 150, y: 14, "text-anchor": "middle", "font-size": 12 }, svg); tt.textContent = L("培養皿", "Dish");
    cells.forEach(function (c) {
      if (c.kind === "B") H.svg("circle", { cx: c.x, cy: c.y, r: 7, fill: COLORS[c.color], stroke: "#3a2e2a", "stroke-width": 1 }, svg);
      else if (c.kind === "M") H.svg("circle", { cx: c.x, cy: c.y, r: 9, fill: "#9a958c", stroke: "#3a2e2a", "stroke-width": 1 }, svg);
      else if (c.kind === "H") {
        H.svg("circle", { cx: c.x, cy: c.y, r: 10, fill: "#9a958c", stroke: "#3a2e2a", "stroke-width": 1 }, svg);
        H.svg("circle", { cx: c.x, cy: c.y, r: 5.5, fill: COLORS[c.color] }, svg);
      } else H.svg("circle", { cx: c.x, cy: c.y, r: 10, fill: "none", stroke: "#9a958c", "stroke-width": 1.5, "stroke-dasharray": "3 2" }, svg);
    });
    // 培養盤
    var tp = H.svg("text", { x: 450, y: 14, "text-anchor": "middle", "font-size": 12 }, svg); tp.textContent = L("24 格培養盤", "24-well plate");
    for (var w = 0; w < 24; w++) {
      var cx = 340 + (w % 6) * 44, cy = 50 + Math.floor(w / 6) * 56;
      var well = wells[w], fill = "var(--paper)", label = "";
      if (well) {
        var pos = well.content.some(function (c) { return c.color === TARGET; });
        var ids = {}; well.content.forEach(function (c) { ids[c.id] = 1; });
        var nClones = Object.keys(ids).length;
        if (well.tested && pos) fill = "#bfe3b4";
        label = well.content.length ? String(well.content.length) : "";
        if (well.tested && pos) label = nClones === 1 ? "★" : nClones + L("株", "");
      }
      H.svg("circle", { cx: cx, cy: cy, r: 18, fill: fill, stroke: "#3a2e2a", "stroke-width": 1.5 }, svg);
      if (well) well.content.slice(0, 4).forEach(function (c, j) { H.svg("circle", { cx: cx - 8 + (j % 2) * 16, cy: cy - 6 + Math.floor(j / 2) * 12, r: 4, fill: COLORS[c.color] }, svg); });
      if (label) { var lt = H.svg("text", { x: cx, y: cy + 30, "text-anchor": "middle", "font-size": 11 }, svg); lt.textContent = label; }
    }

    bNext.textContent = step < steps.length ? steps[step].btn : L("完成！", "Done!");
    bNext.disabled = step >= steps.length;
    var counts = { B: 0, M: 0, H: 0, other: 0 };
    cells.forEach(function (c) { counts[c.kind] !== undefined ? counts[c.kind]++ : counts.other++; });
    var t = "";
    if (step === 0) t = L("小鼠打過疫苗後，脾臟裡會有很多 B 細胞，每一顆只做一種抗體（顏色不同代表抗體不同）。只有橘色的抗體能抓住我們要的病毒。", "After immunization the spleen holds many B cells, each making one antibody (one colour). Only orange binds our virus.");
    else if (step === 1) t = L("B 細胞會做抗體，但在培養皿裡活不了幾天，沒辦法一直生產。", "B cells make antibodies but die within days in a dish.");
    else if (step === 2) t = L("灰色的骨髓瘤細胞是癌細胞，可以一直分裂、長生不死，但不會做我們要的抗體。", "Grey myeloma cells are immortal cancer cells that make no useful antibody.");
    else if (step === 3) t = L("融合後有好幾種結果：B 加骨髓瘤（融合瘤，灰色外殼帶顏色核心）、兩個 B、兩個骨髓瘤（虛線），還有沒融合的。融合瘤：", "After fusion: hybridomas (grey with coloured core), B–B, myeloma–myeloma (dashed) and unfused cells. Hybridomas: ") + counts.H;
    else if (step === 4) t = L("HAT 培養液會殺死骨髓瘤細胞（它們缺少一種酵素）；沒融合的 B 細胞本來就活不久。只剩下融合瘤：既會做抗體，又長生不死！", "HAT kills myeloma cells (they lack an enzyme); unfused B cells die anyway. Only hybridomas survive: antibody-making and immortal!");
    else if (step === 5) t = L("把細胞稀釋後分到小格子裡，每格的數字是細胞數。", "Cells are diluted into wells; the number is cells per well.");
    else {
      var posW = wells.filter(function (w) { return w.content.some(function (c) { return c.color === TARGET; }); });
      var mono = posW.filter(function (w) { var ids = {}; w.content.forEach(function (c) { ids[c.id] = 1; }); return Object.keys(ids).length === 1; });
      t = L("綠色的格子會抓病毒，共 ", "Positive wells: ") + posW.length + L(" 格；其中標 ★ 的只來自單一株細胞，這就是「單株抗體」！", "; those marked ★ come from a single clone: monoclonal!") +
        (mono.length < posW.length ? L("　標「幾株」的格子混了不只一株，要再稀釋一次（重新選殖）。", "　Mixed wells must be re-cloned.") : "");
      if (level === "L3") {
        var p0 = Math.exp(-lambda), p1 = lambda * Math.exp(-lambda);
        t += L("　卜瓦松估計：空格機率 e^−λ = ", "　Poisson: P(empty) = ") + p0.toFixed(2) + L("，有細胞的格子中「只有一顆」的比例 λe^−λ/(1−e^−λ) = ", ", P(single | occupied) = ") + (p1 / (1 - p0)).toFixed(2) + "。";
      }
    }
    msg.textContent = t;
  }
  bNext.addEventListener("click", function () { if (step < steps.length) doStep(); });
  bReset.addEventListener("click", reset);
  draw();
});
