/* 互動元件：珠珠摺疊（2024 化學獎：蛋白質結構預測與設計）
 * 用「HP 晶格模型」簡化蛋白質：每顆珠子不是 H（怕水，疏水性）就是 P（喜歡水，親水性），
 * 只能放在方格上，而且前後相連。兩顆不相鄰的 H 珠子貼在一起，能量就 −1。
 * 能量越低越穩定，就像蛋白質把怕水的胺基酸藏在中間。
 *   摺疊模式（預設）：自己拖曳畫出形狀，或讓電腦用模擬退火找最低能量
 *   設計模式（data-mode="design"）：形狀已經決定，換你決定每顆珠子是 H 還是 P（逆向摺疊，貝克的工作）
 *   程度：L1 用星星計分；L2 顯示能量與可能形狀的數量；L3 加上能量曲線與基準序列的已知最佳值 */
NobelIX.register("hp-fold", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.level || "L2";
  var design = stage.dataset.mode === "design";
  var INK = "#3a2e2a", HC = "#f2a33d", PC = "#7cc3e8";
  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  // 基準序列（Unger & Moult 1993 的 20 顆序列，二維正方晶格已知最低能量為 −9）
  var BENCH = "HPHPPHHPHPPHPHHPPHPH";
  var seq = design ? "PPPPPPPPPPPPPPPP".split("") : (level === "L1" ? "HPPHHPHPPHHP" : BENCH).split("");
  var n = seq.length;
  // 設計模式的目標形狀：4×4 的蛇形
  var TARGET = [];
  if (design) for (var r = 0; r < 4; r++) for (var q = 0; q < 4; q++) TARGET.push([r % 2 ? 3 - q : q, r]);

  var G = design ? 8 : 14, CELL = design ? 46 : 32;
  var OFF = design ? 2 : 0;
  var conf = design ? TARGET.map(function (p) { return [p[0] + OFF, p[1] + OFF]; }) : straight();
  var placed = n;
  function straight() {
    var y = Math.floor(G / 2), x0 = Math.floor((G - n) / 2);
    var c = []; for (var i = 0; i < n; i++) c.push([Math.max(0, x0) + i, y]);
    if (n > G) { c = []; for (i = 0; i < n; i++) { var row = Math.floor(i / (G - 2)); c.push([row % 2 ? G - 2 - (i % (G - 2)) : 1 + (i % (G - 2)), y + row]); } }
    return c;
  }
  function k(x, y) { return x + "," + y; }
  // 把整條鏈移到方格中央（蒙地卡羅移動後，座標可能跑到畫面外）
  function recenter(c) {
    var xs = c.map(function (p) { return p[0]; }), ys = c.map(function (p) { return p[1]; });
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    var dx = Math.floor((G - 1 - (maxx - minx)) / 2) - minx, dy = Math.floor((G - 1 - (maxy - miny)) / 2) - miny;
    return c.map(function (p) { return [p[0] + dx, p[1] + dy]; });
  }
  function contacts(c, upto) {
    var m = {}, list = [], N = upto == null ? n : upto;
    for (var i = 0; i < N; i++) m[k(c[i][0], c[i][1])] = i;
    for (i = 0; i < N; i++) {
      if (seq[i] !== "H") continue;
      for (var d = 0; d < 4; d++) {
        var j = m[k(c[i][0] + DIRS[d][0], c[i][1] + DIRS[d][1])];
        if (j !== undefined && j > i + 1 && seq[j] === "H") list.push([i, j]);
      }
    }
    return list;
  }
  function energy(c) { return -contacts(c).length; }
  function valid(c) { var s = {}; for (var i = 0; i < c.length; i++) { var kk = k(c[i][0], c[i][1]); if (s[kk]) return false; s[kk] = 1; } return true; }

  // ---------- 蒙地卡羅（模擬退火） ----------
  var ROT = [[0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0]];
  function move(c) {
    var nc = c.map(function (p) { return p.slice(); });
    if (Math.random() < 0.5) { // 樞紐旋轉
      var piv = 1 + Math.floor(Math.random() * (n - 2)), R = ROT[Math.floor(Math.random() * 3)], tail = Math.random() < 0.5;
      var px = c[piv][0], py = c[piv][1];
      for (var i = 0; i < n; i++) if (tail ? i > piv : i < piv) {
        var dx = c[i][0] - px, dy = c[i][1] - py;
        nc[i] = [px + R[0] * dx + R[1] * dy, py + R[2] * dx + R[3] * dy];
      }
    } else { // 轉角翻轉／端點移動
      var j = Math.floor(Math.random() * n);
      if (j === 0 || j === n - 1) {
        var a = c[j === 0 ? 1 : n - 2], dd = DIRS[Math.floor(Math.random() * 4)];
        nc[j] = [a[0] + dd[0], a[1] + dd[1]];
      } else {
        var b0 = c[j - 1], b1 = c[j + 1];
        if (Math.abs(b0[0] - b1[0]) === 1 && Math.abs(b0[1] - b1[1]) === 1) nc[j] = [b0[0] + b1[0] - c[j][0], b0[1] + b1[1] - c[j][1]];
      }
    }
    return nc;
  }
  function anneal(start, steps, onStep) {
    var c = start, e = energy(c), best = c, bestE = e;
    for (var s = 0; s < steps; s++) {
      var T = Math.max(0.15, 2 * (1 - s / steps));
      var nc = move(c); if (!valid(nc)) continue;
      var ne = energy(nc);
      if (ne <= e || Math.random() < Math.exp(-(ne - e) / T)) { c = nc; e = ne; if (e < bestE) { bestE = e; best = c; } }
      if (onStep) onStep(s, e);
    }
    return { conf: best, e: bestE };
  }
  // 形狀比較：用每一步的相對轉向（直走／左轉／右轉）描述，鏡像視為相同
  function shapeKey(c) {
    var t = "";
    for (var i = 1; i < n - 1; i++) {
      var ax = c[i][0] - c[i - 1][0], ay = c[i][1] - c[i - 1][1], bx = c[i + 1][0] - c[i][0], by = c[i + 1][1] - c[i][1];
      var cr = ax * by - ay * bx; t += cr === 0 ? "S" : cr > 0 ? "L" : "R";
    }
    var m = t.replace(/L/g, "x").replace(/R/g, "L").replace(/x/g, "R");
    return t < m ? t : m;
  }

  // ---------- 版面 ----------
  var wrap = H.el("div", {}, stage);
  var W = G * CELL;
  var svg = H.svg("svg", { viewBox: "0 0 " + W + " " + W, class: "ix-svg", role: "img", style: "max-width:460px;margin:0 auto;touch-action:none",
    "aria-label": design ? L("目標形狀：點珠子切換怕水或喜歡水", "Target shape: tap beads to switch H/P") : L("珠珠鏈：拖曳來摺疊", "Bead chain: drag to fold") }, wrap);
  var gGrid = H.svg("g", {}, svg), gTarget = H.svg("g", {}, svg), gChain = H.svg("g", {}, svg);
  for (var gx = 0; gx < G; gx++) for (var gy = 0; gy < G; gy++)
    H.svg("circle", { cx: gx * CELL + CELL / 2, cy: gy * CELL + CELL / 2, r: 1.6, fill: "currentColor", opacity: 0.25 }, gGrid);

  var legend = H.el("p", { style: "margin:6px 0 0;font-size:.9em;text-align:center" }, wrap);
  legend.innerHTML = '<span style="color:' + HC + '">●</span> ' + L("怕水（H，疏水性）", "Water-fearing (H)") + "　" +
    '<span style="color:' + PC + '">●</span> ' + L("喜歡水（P，親水性）", "Water-loving (P)") + "　" +
    '<span style="color:#e0663a">┄</span> ' + L("怕水珠珠抱在一起", "H–H contact");
  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0;line-height:1.7" }, wrap);
  var chart = null;

  if (!design) {
    var bReset = H.el("button", { type: "button", class: "ix-btn", text: L("↺ 拉直重來", "↺ Straighten") }, ctr);
    var bDraw = H.el("button", { type: "button", class: "ix-btn", text: L("✏️ 從頭畫一條新的路", "✏️ Draw a new path") }, ctr);
    var bAuto = H.el("button", { type: "button", class: "ix-btn", style: "font-weight:700", text: L("🤖 讓電腦試試看", "🤖 Let the computer try") }, ctr);
    bReset.addEventListener("click", function () { stopAnim(); conf = straight(); placed = n; trace = []; render(); });
    bDraw.addEventListener("click", function () { stopAnim(); placed = 0; trace = []; render(); });
    bAuto.addEventListener("click", function () { autoFold(); });
    if (level === "L3") {
      H.el("p", { text: L("能量隨蒙地卡羅步數的變化", "Energy vs. Monte Carlo steps"), style: "margin:12px 0 2px;font-weight:700" }, wrap);
      chart = H.svg("svg", { viewBox: "0 0 600 130", class: "ix-svg", role: "img", "aria-label": L("能量曲線", "Energy trace") }, wrap);
    }
  } else {
    var bTest = H.el("button", { type: "button", class: "ix-btn", style: "font-weight:700", text: L("🧪 測試我的設計", "🧪 Test my design") }, ctr);
    var bClear = H.el("button", { type: "button", class: "ix-btn", text: L("全部改成喜歡水", "All water-loving") }, ctr);
    bTest.addEventListener("click", testDesign);
    bClear.addEventListener("click", function () { seq = seq.map(function () { return "P"; }); result = null; render(); });
  }

  // ---------- 拖曳畫路徑（摺疊模式） ----------
  var drawing = false;
  function cellOf(ev) {
    var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var m = svg.getScreenCTM(); if (!m) return null;
    var p = pt.matrixTransform(m.inverse());
    var cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    return cx >= 0 && cx < G && cy >= 0 && cy < G ? [cx, cy] : null;
  }
  function occupiedBy(c) { for (var i = 0; i < placed; i++) if (conf[i][0] === c[0] && conf[i][1] === c[1]) return i; return -1; }
  if (!design) {
    svg.addEventListener("pointerdown", function (e) {
      var c = cellOf(e); if (!c) return;
      stopAnim();
      if (placed === 0) { conf[0] = c; placed = 1; }
      else if (placed < n && occupiedBy(c) === placed - 1) { /* 從最後一顆繼續畫 */ }
      else if (placed === n && occupiedBy(c) === -1) return;
      else if (placed === n) { placed = Math.max(1, occupiedBy(c) + 1); } // 從某顆珠子開始重畫後面
      else return;
      drawing = true; svg.setPointerCapture(e.pointerId); render();
    });
    svg.addEventListener("pointermove", function (e) {
      if (!drawing) return; var c = cellOf(e); if (!c) return;
      var last = conf[placed - 1];
      if (c[0] === last[0] && c[1] === last[1]) return;
      if (placed >= 2 && c[0] === conf[placed - 2][0] && c[1] === conf[placed - 2][1]) { placed--; render(); return; } // 往回走＝收回
      if (Math.abs(c[0] - last[0]) + Math.abs(c[1] - last[1]) !== 1) return;
      if (placed < n && occupiedBy(c) === -1) { conf[placed] = c; placed++; trace = []; render(); }
    });
    svg.addEventListener("pointerup", function () { drawing = false; });
  } else {
    svg.addEventListener("click", function (e) {
      var c = cellOf(e); if (!c) return;
      var i = occupiedBy(c); if (i < 0) return;
      seq[i] = seq[i] === "H" ? "P" : "H"; result = null; render();
    });
  }

  // ---------- 自動摺疊（動畫） ----------
  var anim = null, trace = [], bestEver = 0;
  function autoFold() {
    stopAnim();
    var c = placed === n ? conf : straight();
    placed = n;
    var steps = level === "L1" ? 8000 : 30000, s = 0, e = energy(c), best = c, bestE = e;
    trace = [e];
    bAuto.textContent = L("⏸ 停止", "⏸ Stop");
    function frame() {
      for (var b = 0; b < (H.reducedMotion ? steps : 300) && s < steps; b++, s++) {
        var T = Math.max(0.15, 2 * (1 - s / steps));
        var nc = move(c); if (!valid(nc)) continue;
        var ne = energy(nc);
        if (ne <= e || Math.random() < Math.exp(-(ne - e) / T)) { c = nc; e = ne; if (e < bestE) { bestE = e; best = c; } }
      }
      trace.push(e); conf = recenter(c); render(true);
      if (s < steps) anim = requestAnimationFrame(frame);
      else { conf = recenter(best); bestEver = Math.min(bestEver, bestE); stopAnim(); render(); }
    }
    anim = requestAnimationFrame(frame);
  }
  function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; if (bAuto) bAuto.textContent = L("🤖 讓電腦試試看", "🤖 Let the computer try"); }

  // ---------- 設計模式：測試 ----------
  var result = null;
  function testDesign() {
    var targetConf = TARGET.map(function (p) { return p.slice(); });
    var eT = energy(targetConf);
    var bestE = 0, shapes = {}, bestConf = null;
    for (var run = 0; run < 4; run++) {
      var res = anneal(straight(), 12000);
      if (res.e < bestE) { bestE = res.e; shapes = {}; bestConf = res.conf; }
      if (res.e === bestE) shapes[shapeKey(res.conf)] = res.conf;
    }
    if (eT <= bestE) { bestE = eT; shapes[shapeKey(targetConf)] = targetConf; }
    result = { eT: eT, bestE: bestE, count: Object.keys(shapes).length, targetIsBest: eT <= bestE, competitor: bestConf };
    render();
  }

  // ---------- 畫面 ----------
  function center(p) { return [p[0] * CELL + CELL / 2, p[1] * CELL + CELL / 2]; }
  function render(running) {
    gChain.innerHTML = ""; gTarget.innerHTML = "";
    var c = conf, N = placed;
    if (design && result && !result.targetIsBest && result.competitor) {
      // 畫出「搶走」的形狀（虛線）
      var mx = Math.min.apply(null, result.competitor.map(function (p) { return p[0]; }));
      var my = Math.min.apply(null, result.competitor.map(function (p) { return p[1]; }));
      var d0 = result.competitor.map(function (p, i) { var q = center([p[0] - mx + 1, p[1] - my + 1]); return (i ? "L" : "M") + q[0] + " " + q[1]; }).join(" ");
      H.svg("path", { d: d0, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-dasharray": "4 5", opacity: 0.35 }, gTarget);
    }
    // 接觸
    contacts(c, N).forEach(function (pr) {
      var a = center(c[pr[0]]), b = center(c[pr[1]]);
      H.svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#e0663a", "stroke-width": 4, "stroke-dasharray": "3 4", "stroke-linecap": "round" }, gChain);
    });
    // 鍵
    if (N > 1) {
      var d = ""; for (var i = 0; i < N; i++) { var p = center(c[i]); d += (i ? "L" : "M") + p[0] + " " + p[1]; }
      H.svg("path", { d: d, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" }, gChain);
    }
    for (i = 0; i < N; i++) {
      var q = center(c[i]);
      H.svg("circle", { cx: q[0], cy: q[1], r: CELL * 0.34, fill: seq[i] === "H" ? HC : PC, stroke: INK, "stroke-width": 2, style: design ? "cursor:pointer" : "" }, gChain);
      if (i === 0) {
        H.svg("circle", { cx: q[0] - 4, cy: q[1] - 3, r: 2.2, fill: INK }, gChain);
        H.svg("circle", { cx: q[0] + 4, cy: q[1] - 3, r: 2.2, fill: INK }, gChain);
        H.svg("path", { d: "M" + (q[0] - 4) + " " + (q[1] + 3) + " Q" + q[0] + " " + (q[1] + 7) + " " + (q[0] + 4) + " " + (q[1] + 3), fill: "none", stroke: INK, "stroke-width": 1.6 }, gChain);
      } else if (design || level !== "L1") {
        var t = H.svg("text", { x: q[0], y: q[1] + 4, "text-anchor": "middle", "font-size": 11, style: "fill:#3a2e2a;font-weight:700", "pointer-events": "none" }, gChain);
        t.textContent = seq[i];
      }
    }
    if (!design && N < n && N > 0) {
      var lp = center(c[N - 1]);
      H.svg("circle", { cx: lp[0], cy: lp[1], r: CELL * 0.48, fill: "none", stroke: "#e0663a", "stroke-width": 2.5, "stroke-dasharray": "4 3" }, gChain);
    }
    if (chart) drawChart();

    // 文字
    var e = -contacts(c, N).length;
    if (design) {
      var hs = seq.filter(function (s) { return s === "H"; }).length;
      var txt = L("目標形狀的能量：", "Target energy: ") + energy(conf) + L("（怕水珠珠 ", " (H beads: ") + hs + L(" 顆）。點珠子切換 H／P，再按「測試我的設計」。", "). Tap beads, then test.");
      if (result) {
        if (!result.targetIsBest) txt = L("😮 你的序列比較喜歡另一種形狀（虛線），能量是 ", "😮 Your sequence prefers another shape (dashed), energy ") + result.bestE + L("，比目標的 ", ", lower than the target's ") + result.eT + L(" 更低。試著把怕水的珠珠放在形狀的中間。", ". Try putting H beads in the middle.");
        else if (result.eT === 0) txt = L("目前沒有任何怕水珠珠抱在一起，任何形狀都一樣穩定。把中間的珠珠改成怕水試試！", "No H–H contacts yet: every shape is equally stable. Make the middle beads H!");
        else {
          txt = L("🎉 成功！目標形狀是電腦找到的最低能量形狀之一（能量 ", "🎉 The target is one of the lowest-energy shapes (energy ") + result.eT + "）。";
          if (level !== "L1" && result.count > 1) txt += L("不過電腦還找到 ", " The search also found ") + (result.count - 1) + L(" 種一樣穩定的其他形狀。好的設計不只要讓目標很穩定，還要讓其他形狀都比較不穩定。", " other equally stable shapes: good designs also make the alternatives unstable.");
        }
      }
      msg.textContent = txt;
      return;
    }
    if (N < n) {
      msg.textContent = N === 0
        ? L("在格子上任選一個起點，按住拖曳，一格一格畫出珠珠鏈的路線。", "Press on any grid point and drag to lay out the chain.")
        : L("繼續拖曳，還有 ", "Keep dragging: ") + (n - N) + L(" 顆珠珠要放。往回拖可以收回。", " beads left. Drag back to undo.");
      return;
    }
    if (level === "L1") {
      msg.textContent = (running ? L("電腦正在試各種形狀…… ", "The computer is trying shapes… ") : "") + L("怕水的珠珠抱在一起：", "Hugs between water-fearing beads: ") + (e ? "⭐".repeat(-e) : L("還沒有", "none yet")) +
        (running ? "" : L("　把橘色的珠珠擠到中間，就能得到更多星星！", "　Squeeze the orange beads together for more stars!"));
    } else {
      var t2 = L("能量 E = ", "Energy E = ") + e + L("（每一對抱在一起的怕水珠珠 −1）", " (−1 per H–H contact)");
      if (level === "L3") t2 += L("　這條基準序列已知的最低能量是 −9。", "　Known optimum for this benchmark: −9.");
      else t2 += L("　這條 20 顆的珠珠鏈，可以在方格上排出超過 3 億種不同的路徑。", "　This 20-bead chain has over 300 million possible paths on the grid.");
      if (running) t2 = L("模擬退火中…… ", "Annealing… ") + t2;
      msg.textContent = t2;
    }
  }
  function drawChart() {
    chart.innerHTML = "";
    var M = { l: 34, r: 10, t: 8, b: 22 }, pw = 600 - M.l - M.r, ph = 130 - M.t - M.b;
    var g = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, chart);
    var lo = -10, hi = 0;
    [0, -3, -6, -9].forEach(function (v) {
      var y = (v - hi) / (lo - hi) * ph;
      H.svg("line", { x1: 0, y1: y, x2: pw, y2: y, stroke: "currentColor", opacity: v === -9 ? 0.4 : 0.1, "stroke-dasharray": v === -9 ? "4 4" : null }, g);
      var t = H.svg("text", { x: -6, y: y + 4, "text-anchor": "end", "font-size": 11 }, g); t.textContent = v;
    });
    if (trace.length > 1) {
      var d = trace.map(function (v, i) { return (i ? "L" : "M") + (i / Math.max(1, 100) * pw).toFixed(1) + " " + ((v - hi) / (lo - hi) * ph).toFixed(1); }).join(" ");
      H.svg("path", { d: d, fill: "none", stroke: "var(--field)", "stroke-width": 2 }, g);
    }
    var xl = H.svg("text", { x: pw, y: ph + 18, "text-anchor": "end", "font-size": 11, opacity: 0.8 }, g); xl.textContent = L("步數 →（溫度逐漸降低）", "steps → (cooling)");
  }
  render();
});
