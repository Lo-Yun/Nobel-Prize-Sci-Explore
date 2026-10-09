/* 互動元件：共同演化與接觸預測（2024 化學獎：AlphaFold 的關鍵線索之一）
 * 同一個蛋白質家族裡，在立體結構中「貼在一起」的兩個位置，往往會一起改變：
 * 一邊從帶正電換成帶負電，另一邊也跟著換，才能繼續互相吸引。
 * 只看很多條相關序列的「排比」（MSA），就能猜出哪些位置在結構中相鄰。
 *   L2：序列排比、熱圖、預測接觸
 *   L3：加上相互資訊（MI）的數值、平均乘積校正（APC）與序列數量的影響 */
NobelIX.register("coevolution", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var LEN = 14;
  // 真實結構：髮夾形，位置 i 和 13−i 互相接觸（6 和 7 是轉彎處）
  var TRUE = [];
  for (var i = 0; i < 6; i++) TRUE.push([i, 13 - i]);
  function isTrue(a, b) { return TRUE.some(function (t) { return (t[0] === a && t[1] === b) || (t[0] === b && t[1] === a); }); }
  var PAIRS = [["K", "E"], ["E", "K"], ["R", "D"], ["D", "R"], ["L", "I"], ["I", "L"], ["F", "V"], ["V", "F"]];
  var ALL = "ACDEFGHIKLMNPQRSTVWY";
  var TURN = ["G", "P", "N", "D", "S"];
  var COLOR = function (a) {
    if ("KRH".indexOf(a) >= 0) return "#7cc3e8";
    if ("DE".indexOf(a) >= 0) return "#ef8f8f";
    if ("LIVFMWAC".indexOf(a) >= 0) return "#f2c06a";
    return "#d9d4c7";
  };
  var state = { K: level === "L3" ? 40 : 30, top: 6, apc: level === "L3", sel: null };
  var msa = [];
  function generate() {
    msa = [];
    for (var s = 0; s < 80; s++) {
      var row = new Array(LEN);
      TRUE.forEach(function (t) {
        var p = PAIRS[Math.floor(Math.random() * PAIRS.length)];
        row[t[0]] = p[0]; row[t[1]] = p[1];
      });
      row[6] = TURN[Math.floor(Math.random() * TURN.length)];
      row[7] = TURN[Math.floor(Math.random() * TURN.length)];
      for (var k = 0; k < LEN; k++) if (Math.random() < 0.12) row[k] = ALL[Math.floor(Math.random() * ALL.length)]; // 隨機突變（雜訊）
      msa.push(row);
    }
  }
  function mi() {
    var rows = msa.slice(0, state.K), M = [];
    var freq1 = [];
    for (var a = 0; a < LEN; a++) { var f = {}; rows.forEach(function (r) { f[r[a]] = (f[r[a]] || 0) + 1; }); freq1.push(f); }
    for (a = 0; a < LEN; a++) { M.push(new Array(LEN).fill(0)); }
    for (a = 0; a < LEN; a++) for (var b = a + 1; b < LEN; b++) {
      var f2 = {}; rows.forEach(function (r) { var kk = r[a] + r[b]; f2[kk] = (f2[kk] || 0) + 1; });
      var v = 0, n = rows.length;
      for (var kk in f2) { var pab = f2[kk] / n, pa = freq1[a][kk[0]] / n, pb = freq1[b][kk[1]] / n; v += pab * Math.log(pab / (pa * pb)); }
      M[a][b] = M[b][a] = v;
    }
    if (state.apc) {
      var mean = [], all = 0, cnt = 0;
      for (a = 0; a < LEN; a++) { var s = 0; for (b = 0; b < LEN; b++) if (b !== a) s += M[a][b]; mean.push(s / (LEN - 1)); all += s; cnt += LEN - 1; }
      all /= cnt;
      var C = M.map(function (r, x) { return r.map(function (v2, y) { return x === y ? 0 : v2 - mean[x] * mean[y] / all; }); });
      return C;
    }
    return M;
  }

  var wrap = H.el("div", {}, stage);
  var row1 = H.el("div", { style: "display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start" }, wrap);
  var colA = H.el("div", { style: "flex:1 1 260px;min-width:0" }, row1);
  var colB = H.el("div", { style: "flex:1 1 240px;min-width:0;max-width:320px" }, row1);
  H.el("p", { text: L("① 同一家族的序列排比（每一列是一種生物的版本，上方數字是位置）", "① Alignment of related sequences (rows = species)"), style: "margin:0 0 4px;font-weight:700;font-size:.92em" }, colA);
  var msaBox = H.el("div", { style: "overflow-x:auto" }, colA);
  H.el("p", { text: L("② 哪些位置一起變化？（點格子看看）", "② Which positions change together? (tap a cell)"), style: "margin:0 0 4px;font-weight:700;font-size:.92em" }, colB);
  var heat = H.svg("svg", { viewBox: "-22 -22 322 322", class: "ix-svg", role: "img", "aria-label": L("位置兩兩之間的共同變化熱圖", "Co-variation heat map") }, colB);
  H.el("p", { text: L("③ 根據最明顯的共同變化，預測哪些位置貼在一起", "③ Predicted contacts from the strongest co-variation"), style: "margin:12px 0 4px;font-weight:700;font-size:.92em" }, wrap);
  var fold = H.svg("svg", { viewBox: "0 0 600 170", class: "ix-svg", role: "img", "aria-label": L("預測的接觸畫在髮夾形結構上", "Predicted contacts on the hairpin") }, wrap);

  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  function slider(label, key, min, max, step, fmt) {
    var lab = H.el("label", {}, ctr);
    H.el("span", { text: label }, lab);
    var inp = H.el("input", { type: "range", min: min, max: max, step: step, value: state[key], id: id + "-" + key }, lab);
    var out = H.el("span", { class: "ix-readout", text: fmt(state[key]) }, lab);
    inp.addEventListener("input", function () { state[key] = +inp.value; out.textContent = fmt(state[key]); render(); });
  }
  slider(L("序列數量", "Sequences"), "K", 4, 80, 1, function (v) { return v + L(" 條", ""); });
  slider(L("畫出幾條預測", "Predictions shown"), "top", 1, 12, 1, function (v) { return v; });
  var bNew = H.el("button", { type: "button", class: "ix-btn", text: L("🎲 換一組序列", "🎲 New family") }, ctr);
  bNew.addEventListener("click", function () { generate(); state.sel = null; render(); });
  if (level === "L3") {
    var bApc = H.el("button", { type: "button", class: "ix-btn", text: L("APC 校正", "APC correction") }, ctr);
    bApc.addEventListener("click", function () { state.apc = !state.apc; render(); });
  }
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0;line-height:1.7" }, wrap);

  function render() {
    var M = mi();
    if (bApc) bApc.setAttribute("aria-pressed", String(state.apc));
    // ① 排比
    msaBox.innerHTML = "";
    var tbl = H.el("table", { style: "border-collapse:collapse;font-family:var(--font-data);font-size:11px" }, msaBox);
    var head = H.el("tr", {}, tbl);
    H.el("th", {}, head);
    for (var c = 0; c < LEN; c++) H.el("th", { text: c + 1, style: "padding:0;font-weight:500;opacity:.7;font-size:10px" }, head);
    var show = Math.min(state.K, 12);
    for (var r = 0; r < show; r++) {
      var tr = H.el("tr", {}, tbl);
      H.el("td", { text: r + 1, style: "padding-right:4px;opacity:.6;white-space:nowrap;font-size:10px;text-align:right" }, tr);
      for (c = 0; c < LEN; c++) {
        var on = state.sel && (state.sel[0] === c || state.sel[1] === c);
        H.el("td", { text: msa[r][c], style: "text-align:center;padding:0;width:17px;height:17px;color:#3a2e2a;background:" + COLOR(msa[r][c]) +
          ";outline:" + (on ? "2px solid var(--ink)" : "none") + ";opacity:" + (state.sel && !on ? .45 : 1) }, tr);
      }
    }
    if (state.K > show) H.el("p", { text: L("……還有 ", "…and ") + (state.K - show) + L(" 條序列", " more"), style: "margin:2px 0 0;font-size:.85em;opacity:.7" }, msaBox);

    // ② 熱圖
    heat.innerHTML = "";
    var cs = 300 / LEN, mx = 0;
    for (var ax = 0; ax < LEN; ax++) {
      var tA = H.svg("text", { x: ax * cs + cs / 2, y: -7, "text-anchor": "middle", "font-size": 10, opacity: 0.7 }, heat); tA.textContent = ax + 1;
      var tB = H.svg("text", { x: -5, y: ax * cs + cs / 2 + 3, "text-anchor": "end", "font-size": 10, opacity: 0.7 }, heat); tB.textContent = ax + 1;
    }
    var mn = Infinity;
    for (var a = 0; a < LEN; a++) for (var b = 0; b < LEN; b++) if (a !== b) { if (M[a][b] > mx) mx = M[a][b]; if (M[a][b] < mn) mn = M[a][b]; }
    for (a = 0; a < LEN; a++) for (b = 0; b < LEN; b++) {
      if (a === b) { H.svg("rect", { x: a * cs, y: b * cs, width: cs - 1, height: cs - 1, fill: "currentColor", opacity: 0.08 }, heat); continue; }
      var v = (M[a][b] - mn) / ((mx - mn) || 1); // 用最小到最大值上色，凸顯差異
      var cell = H.svg("rect", { x: a * cs, y: b * cs, width: cs - 1, height: cs - 1, fill: "var(--field)", "fill-opacity": (0.05 + 0.95 * v).toFixed(2), style: "cursor:pointer" }, heat);
      if (state.sel && ((state.sel[0] === a && state.sel[1] === b) || (state.sel[0] === b && state.sel[1] === a)))
        H.svg("rect", { x: a * cs + 1, y: b * cs + 1, width: cs - 3, height: cs - 3, fill: "none", stroke: "#e0663a", "stroke-width": 2.5, "pointer-events": "none" }, heat);
      (function (a, b) { cell.addEventListener("click", function () { state.sel = [Math.min(a, b), Math.max(a, b)]; render(); }); })(a, b);
    }

    // 排出前幾名
    var pairs = [];
    for (a = 0; a < LEN; a++) for (b = a + 2; b < LEN; b++) pairs.push([a, b, M[a][b]]);
    pairs.sort(function (p, q) { return q[2] - p[2]; });
    var top = pairs.slice(0, state.top), right = top.filter(function (p) { return isTrue(p[0], p[1]); }).length;

    // ③ 髮夾形結構
    fold.innerHTML = "";
    function pos(i) { return i < 7 ? [60 + i * 70, 50] : [60 + (13 - i) * 70, 120]; }
    top.forEach(function (p) {
      var A = pos(p[0]), B = pos(p[1]), ok = isTrue(p[0], p[1]);
      H.svg("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: ok ? "#2e8b57" : "#d9534f", "stroke-width": 4, "stroke-dasharray": ok ? null : "5 5", opacity: 0.85 }, fold);
    });
    var d = ""; for (i = 0; i < LEN; i++) { var q = pos(i); d += (i ? "L" : "M") + q[0] + " " + q[1]; }
    var t7 = pos(6), t8 = pos(7);
    d = d.replace("L" + t8[0] + " " + t8[1], "Q" + (t7[0] + 50) + " " + ((t7[1] + t8[1]) / 2) + " " + t8[0] + " " + t8[1]);
    H.svg("path", { d: d, fill: "none", stroke: "currentColor", "stroke-width": 3, opacity: 0.6 }, fold);
    for (i = 0; i < LEN; i++) {
      var pp = pos(i);
      var on2 = state.sel && (state.sel[0] === i || state.sel[1] === i);
      H.svg("circle", { cx: pp[0], cy: pp[1], r: 15, fill: on2 ? "#ffe58a" : "var(--paper)", stroke: "currentColor", "stroke-width": 2 }, fold);
      var tx = H.svg("text", { x: pp[0], y: pp[1] + 4, "text-anchor": "middle", "font-size": 12 }, fold); tx.textContent = i + 1;
    }
    var lg = H.svg("text", { x: 10, y: 160, "font-size": 11, opacity: 0.8 }, fold);
    lg.textContent = L("綠色實線＝猜對（真的貼在一起）　紅色虛線＝猜錯", "Green = correct contact, red dashed = wrong");

    var text = L("前 ", "Top ") + state.top + L(" 名預測中，猜對 ", " predictions: ") + right + L(" 條。", " correct. ");
    if (state.sel) {
      var a1 = state.sel[0], b1 = state.sel[1];
      text += L("位置 ", "Positions ") + (a1 + 1) + L(" 和 ", " and ") + (b1 + 1) + "：" +
        (level === "L3" ? (state.apc ? "MI−APC = " : "MI = ") + M[a1][b1].toFixed(3) + L(" nat。", " nats. ") : "") +
        (isTrue(a1, b1) ? L("它們在結構裡真的貼在一起，所以一起改變（例如 K 配 E、R 配 D）。", "They really touch, so they change together (K with E, R with D…).")
          : L("它們在結構裡沒有貼在一起，各自隨機改變。", "They don't touch; each changes on its own."));
    } else text += L("序列越少，雜訊越多，猜錯也越多；試著把序列數量調少看看。", "Fewer sequences → more noise and more wrong guesses. Try lowering the count.");
    msg.textContent = text;
  }
  generate();
  render();
});
