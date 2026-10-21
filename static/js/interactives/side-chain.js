/* 互動元件：艾利希的側鏈理論（1908 艾利希）
 * 細胞表面有各種形狀的「側鏈」（今天稱為受體）。毒素只會卡進形狀相符的側鏈。
 * 細胞的側鏈被佔住之後，會補做更多同樣的側鏈；多出來的側鏈脫落到血液中，
 * 變成「抗毒素」（抗體），在毒素碰到細胞之前就把它抓住、中和。
 *   L1：鎖和鑰匙的比喻
 *   L2：側鏈理論的完整流程，以及第二次注射時的差別
 *   L3：加上「毒素–抗毒素滴定」：用質量作用定律重現艾利希的 L₀、L₊ 劑量之謎 */
NobelIX.register("side-chain", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var INK = "#3a2e2a";
  var TYPES = ["tri", "sq", "circ"];
  var COL = { tri: "#e0663a", sq: "#3d6fb6", circ: "#8a5cc4" };
  var NAME = { tri: L("三角形", "triangle"), sq: L("方形", "square"), circ: L("圓形", "circle") };
  var CX = 150, CY = 165, R = 92;

  var wrap = H.el("div", {}, stage);
  var svg = H.svg("svg", { viewBox: "0 0 600 330", class: "ix-svg", role: "img", "aria-label": L("細胞、側鏈與毒素的模擬", "Cell, side chains and toxins") }, wrap);
  H.sketchDefs(svg, id);
  H.svg("rect", { x: 270, y: 10, width: 320, height: 310, rx: 14, fill: "#f7d9d4", opacity: 0.55 }, svg);
  var tb = H.svg("text", { x: 430, y: 32, "text-anchor": "middle", "font-size": 13, style: "fill:#a0434b;font-weight:700" }, svg);
  tb.textContent = L("血液", "Blood");
  H.svg("circle", { cx: CX, cy: CY, r: R, fill: "#fbe9c9", filter: "url(#" + id + "-pencil)" }, svg);
  H.svg("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: INK, "stroke-width": 2.6, filter: "url(#" + id + "-rough)" }, svg);
  H.svg("circle", { cx: CX - 10, cy: CY + 8, r: 30, fill: "#d9c2ef", stroke: INK, "stroke-width": 1.5, filter: "url(#" + id + "-rough)" }, svg);
  var tc = H.svg("text", { x: CX - 10, y: CY + 12, "text-anchor": "middle", "font-size": 12 }, svg);
  tc.textContent = L("細胞核", "nucleus");
  var gRec = H.svg("g", {}, svg), gMov = H.svg("g", {}, svg);

  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  H.el("span", { text: L("注射毒素：", "Inject toxin: ") }, ctr);
  TYPES.forEach(function (t) {
    var b = H.el("button", { type: "button", class: "ix-btn", text: { tri: "▲", sq: "■", circ: "●" }[t] + " " + NAME[t] }, ctr);
    b.addEventListener("click", function () { inject(t); });
  });
  var bReset = H.el("button", { type: "button", class: "ix-btn", text: L("↺ 重新開始", "↺ Reset") }, ctr);
  bReset.addEventListener("click", reset);
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0;line-height:1.7" }, wrap);

  var slots, toxins, free, history, firstHit;
  function reset() {
    slots = [];
    for (var i = 0; i < 12; i++) slots.push({ a: -Math.PI / 2 + i * Math.PI * 2 / 12, type: TYPES[i % 3], bound: null, timer: 0 });
    toxins = []; free = []; history = { injected: {}, neutralized: 0, hitCell: 0 }; firstHit = {};
  }
  reset();
  function inject(t) {
    history.injected[t] = (history.injected[t] || 0) + 1;
    for (var i = 0; i < 6; i++) toxins.push({ type: t, x: 560 + Math.random() * 20, y: 60 + Math.random() * 220, vx: 0, vy: 0, state: "free", fade: 0 });
  }
  function slotPos(s, out) { var r = R + (out || 0); return [CX + r * Math.cos(s.a), CY + r * Math.sin(s.a)]; }

  function shapePath(t, x, y, r) {
    if (t === "tri") return "M" + x + " " + (y - r) + " L" + (x + r * 0.9) + " " + (y + r * 0.7) + " L" + (x - r * 0.9) + " " + (y + r * 0.7) + " Z";
    if (t === "sq") return "M" + (x - r * 0.75) + " " + (y - r * 0.75) + " h" + (r * 1.5) + " v" + (r * 1.5) + " h" + (-r * 1.5) + " Z";
    return "M" + (x - r) + " " + y + " a" + r + " " + r + " 0 1 0 " + (2 * r) + " 0 a" + r + " " + r + " 0 1 0 " + (-2 * r) + " 0";
  }

  function tick() {
    // 毒素移動：往左飄，帶點隨機
    toxins.forEach(function (t) {
      if (t.state === "free") {
        t.vx = t.vx * 0.9 + (-0.25 + (Math.random() - 0.5) * 0.9) * 0.3;
        t.vy = t.vy * 0.9 + (Math.random() - 0.5) * 0.5;
        t.x += t.vx * 2; t.y = Math.max(20, Math.min(310, t.y + t.vy * 2));
        // 碰到形狀相符、空著的側鏈就卡住
        slots.forEach(function (s) {
          if (t.state !== "free" || s.bound || s.type !== t.type) return;
          var p = slotPos(s, 14);
          if (Math.hypot(p[0] - t.x, p[1] - t.y) < 22) { t.state = "bound"; s.bound = t; s.timer = 0; t.x = p[0]; t.y = p[1]; history.hitCell++; firstHit[t.type] = true; }
        });
        if (t.x < CX + R + 12 && t.state === "free") { // 碰到細胞但沒有對應的側鏈：彈開
          var dx = t.x - CX, dy = t.y - CY, d = Math.hypot(dx, dy);
          if (d < R + 16) { // 沿著細胞表面滑動，去找形狀相符的側鏈
            t.x = CX + dx / d * (R + 16); t.y = CY + dy / d * (R + 16);
            var tang = (t.slide = t.slide || (Math.random() < 0.5 ? -1 : 1));
            t.x += -dy / d * tang * 2.2; t.y += dx / d * tang * 2.2; t.vx = 0.1;
          }
        }
        // 被血液中的抗毒素抓住
        free.forEach(function (a) {
          if (a.used || a.type !== t.type || t.state !== "free") return;
          if (Math.hypot(a.x - t.x, a.y - t.y) < 20) { a.used = true; t.state = "neutral"; history.neutralized++; }
        });
      } else if (t.state === "neutral") t.fade++;
    });
    toxins = toxins.filter(function (t) { return !(t.state === "neutral" && t.fade > 240); });
    // 被佔住的側鏈：細胞補做更多同類側鏈，多的脫落到血液中
    slots.forEach(function (s) {
      if (!s.bound) return;
      s.timer++;
      if (s.timer === 90) {
        for (var k = 0; k < 4; k++) {
          var p = slotPos(s, 18);
          free.push({ type: s.type, x: Math.max(290, p[0]), y: p[1], vx: 2 + Math.random() * 2, vy: (Math.random() - 0.5) * 3, used: false });
        }
      }
      if (s.timer > 150) { s.bound.state = "gone"; s.bound = null; s.timer = 0; } // 細胞把卡住的側鏈換掉
    });
    toxins = toxins.filter(function (t) { return t.state !== "gone"; });
    free.forEach(function (a) {
      if (a.used) return;
      a.vx = a.vx * 0.97 + (Math.random() - 0.5) * 0.5; a.vy = a.vy * 0.97 + (Math.random() - 0.5) * 0.5;
      a.x = Math.max(285, Math.min(580, a.x + a.vx)); a.y = Math.max(25, Math.min(305, a.y + a.vy));
      if (a.x <= 286 || a.x >= 579) a.vx = -a.vx; if (a.y <= 26 || a.y >= 304) a.vy = -a.vy;
    });
    free = free.filter(function (a) { return !a.used; }).slice(-60);
    draw();
    requestAnimationFrame(tick);
  }
  function draw() {
    gRec.innerHTML = ""; gMov.innerHTML = "";
    slots.forEach(function (s) {
      var a = slotPos(s, 0), b = slotPos(s, 10), c = slotPos(s, 16);
      H.svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: INK, "stroke-width": 2 }, gRec);
      H.svg("path", { d: shapePath(s.type, c[0], c[1], 7), fill: "#fff", stroke: COL[s.type], "stroke-width": 2.4 }, gRec);
    });
    toxins.forEach(function (t) {
      var col = t.state === "neutral" ? "#9a958c" : COL[t.type];
      var g = H.svg("g", { opacity: t.state === "neutral" ? Math.max(0, 1 - t.fade / 240) : 1 }, gMov);
      H.svg("path", { d: shapePath(t.type, t.x, t.y, 7), fill: col, stroke: INK, "stroke-width": 1.2 }, g);
      if (t.state === "free") H.svg("path", { d: "M" + (t.x - 3) + " " + (t.y + 1) + " l2 -2 M" + (t.x + 3) + " " + (t.y + 1) + " l-2 -2", stroke: "#fff", "stroke-width": 1.2 }, g);
    });
    free.forEach(function (a) {
      H.svg("path", { d: shapePath(a.type, a.x, a.y, 6), fill: "none", stroke: COL[a.type], "stroke-width": 2.2 }, gMov);
      H.svg("line", { x1: a.x, y1: a.y + 6, x2: a.x, y2: a.y + 13, stroke: COL[a.type], "stroke-width": 2 }, gMov);
    });
    var freeTox = toxins.filter(function (t) { return t.state === "free"; }).length;
    var anti = free.length;
    var t2;
    var inj = Object.keys(history.injected).length;
    if (!inj) t2 = level === "L1"
      ? L("細胞表面有三種形狀的「鎖」。按上面的按鈕放入毒素「鑰匙」，看看會發生什麼事。", "The cell has three shapes of locks. Inject some toxin keys!")
      : L("細胞表面有三種形狀的側鏈。注射一種毒素，觀察細胞的反應；等一下再注射同一種，比較兩次的差別。", "Inject a toxin, watch the cell respond, then inject the same toxin again.");
    else {
      t2 = L("血液中的毒素 ", "Free toxins ") + freeTox + L("　已被中和 ", "　neutralized ") + history.neutralized + L("　血液中的抗毒素 ", "　antitoxins in blood ") + anti + "。";
      var again = TYPES.filter(function (t) { return history.injected[t] > 1; });
      if (again.length && history.neutralized > 0) t2 += L("　第二次注射時，血液裡早就有現成的抗毒素，大部分毒素還沒碰到細胞就被抓住了！", "　Second time round, ready-made antitoxins catch the toxin before it reaches the cell!");
      else if (anti > 0) t2 += level === "L1" ? L("　細胞做了好多同形狀的鎖，丟到血液裡去抓鑰匙！", "　The cell made spare locks and threw them into the blood!")
        : L("　被佔住的側鏈促使細胞過量製造同一種側鏈，多餘的脫落到血液中，就是抗毒素。", "　Blocked side chains make the cell overproduce them; the excess enters the blood as antitoxin.");
    }
    msg.textContent = t2;
  }
  requestAnimationFrame(tick);

  // ---------- L3：毒素–抗毒素滴定 ----------
  if (level === "L3") {
    H.el("p", { text: L("毒素–抗毒素滴定：L₀ 與 L₊ 劑量", "Toxin–antitoxin titration: the L₀ and L₊ doses"), style: "margin:16px 0 2px;font-weight:700" }, wrap);
    var tsvg = H.svg("svg", { viewBox: "0 0 600 220", class: "ix-svg", role: "img", "aria-label": L("游離毒素隨加入毒素量變化的圖", "Free toxin vs added toxin") }, wrap);
    var tctr = H.el("div", { class: "ix-controls" }, wrap);
    var tlab = H.el("label", {}, tctr);
    H.el("span", { text: L("解離常數 K（MLD，對數刻度）", "Dissociation constant K (MLD, log scale)") }, tlab);
    var kInp = H.el("input", { type: "range", min: -5, max: -2, step: 0.05, value: -3, id: id + "-K" }, tlab);
    var kOut = H.el("span", { class: "ix-readout" }, tlab);
    var tmsg = H.el("p", { class: "ix-readout", style: "margin:6px 0 0;line-height:1.7" }, wrap);
    var U = 100; // 一個抗毒素單位，依定義在完全結合時可中和 100 MLD
    var SAFE = 0.05, LETHAL = 1;
    function freeToxin(x, K) { // 質量作用：C² − (x + U + K)C + xU = 0
      var b = x + U + K, C = (b - Math.sqrt(Math.max(0, b * b - 4 * x * U))) / 2;
      return x - C;
    }
    function solve(target, K) { var lo = 0, hi = 200; for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2; if (freeToxin(m, K) < target) lo = m; else hi = m; } return (lo + hi) / 2; }
    function drawT() {
      var K = Math.pow(10, +kInp.value); kOut.textContent = K.toExponential(1);
      tsvg.innerHTML = "";
      var M = { l: 44, r: 16, t: 12, b: 30 }, pw = 600 - M.l - M.r, ph = 220 - M.t - M.b;
      var g = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, tsvg);
      var X0 = 80, X1 = 105, Y1 = 4;
      function sx(x) { return (x - X0) / (X1 - X0) * pw; }
      function sy(y) { return ph - Math.min(y, Y1) / Y1 * ph; }
      [80, 85, 90, 95, 100, 105].forEach(function (v) {
        H.svg("line", { x1: sx(v), y1: 0, x2: sx(v), y2: ph, stroke: "currentColor", opacity: 0.08 }, g);
        var t = H.svg("text", { x: sx(v), y: ph + 16, "text-anchor": "middle", "font-size": 11 }, g); t.textContent = v;
      });
      [0, 1, 2, 3, 4].forEach(function (v) { var t = H.svg("text", { x: -6, y: sy(v) + 4, "text-anchor": "end", "font-size": 11 }, g); t.textContent = v; });
      H.svg("line", { x1: 0, y1: sy(LETHAL), x2: pw, y2: sy(LETHAL), stroke: "#c0392b", "stroke-dasharray": "5 4" }, g);
      var tl = H.svg("text", { x: pw - 4, y: sy(LETHAL) - 5, "text-anchor": "end", "font-size": 11, style: "fill:#c0392b" }, g); tl.textContent = L("致死：游離毒素 1 MLD", "lethal: 1 MLD free");
      var d = "";
      for (var x = X0; x <= X1; x += 0.1) d += (d ? "L" : "M") + sx(x).toFixed(1) + " " + sy(freeToxin(x, K)).toFixed(1);
      H.svg("path", { d: d, fill: "none", stroke: "var(--field)", "stroke-width": 2.2 }, g);
      var d0 = "M" + sx(X0) + " " + sy(0) + " L" + sx(U) + " " + sy(0) + " L" + sx(X1) + " " + sy(X1 - U);
      H.svg("path", { d: d0, fill: "none", stroke: "currentColor", "stroke-width": 1.5, "stroke-dasharray": "3 4", opacity: 0.6 }, g);
      var L0 = solve(SAFE, K), Lp = solve(LETHAL, K);
      [[L0, "L₀"], [Lp, "L₊"]].forEach(function (m) {
        H.svg("line", { x1: sx(m[0]), y1: 0, x2: sx(m[0]), y2: ph, stroke: "currentColor", "stroke-width": 1.2 }, g);
        var right = m[1] === "L₊";
        var t = H.svg("text", { x: sx(m[0]) + (right ? 4 : -4), y: 12, "text-anchor": right ? "start" : "end", "font-size": 12, style: "font-weight:700" }, g); t.textContent = m[1];
      });
      var xl = H.svg("text", { x: pw, y: ph + 28, "text-anchor": "end", "font-size": 11, opacity: 0.8 }, g); xl.textContent = L("加入一單位抗毒素的毒素量（MLD）", "toxin added to one antitoxin unit (MLD)");
      tmsg.textContent = L("假設游離毒素低於 0.05 MLD 時沒有症狀。虛線：完全結合（K = 0）時，L₊ − L₀ ≈ 1 MLD。藍線：可逆結合時，L₊ − L₀ = ", "Assume no symptoms below 0.05 MLD free toxin. Dashed: irreversible binding gives L₊ − L₀ ≈ 1 MLD. Blue: reversible binding gives L₊ − L₀ = ") + (Lp - L0).toFixed(2) +
        L(" MLD。艾利希實際量到的差距明顯大於 1，他用「類毒素」解釋；阿瑞尼斯與馬德森則主張這是可逆結合的質量作用效應。", " MLD. Ehrlich measured gaps well above 1 and invoked 'toxoids'; Arrhenius and Madsen argued for mass action.");
    }
    kInp.addEventListener("input", drawT);
    drawT();
  }
});
