/* 互動元件：發炎反應模擬（1908 梅契尼可夫、艾利希）
 * 上方是血管，下方是組織。插入一根帶著細菌的刺之後：
 *   1. 受傷的組織和細菌放出「求救訊號」，訊號在組織中擴散
 *   2. 血管擴張（紅、熱），血管變得容易滲漏（腫）
 *   3. 白血球（嗜中性球）從血管壁鑽出來，順著訊號越來越濃的方向前進（趨化作用）
 *   4. 白血球把細菌吞掉（吞噬作用，梅契尼可夫）
 *   5. 打開「抗體標記」：抗體貼在細菌上，白血球更容易吞噬（調理作用，連結艾利希的體液免疫）
 * L1：可以拖曳「小噬」親自去吃細菌；L2：顯示紅熱腫痛；L3：加上族群數量隨時間的圖 */
NobelIX.register("inflammation-sim", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var W = 600, Hh = 380, CELL = 10, GX = W / CELL, GY = Hh / CELL;
  var WOUND = { x: 300, y: 215 };

  var wrap = H.el("div", {}, stage);
  var cv = H.el("canvas", { width: W * 2, height: Hh * 2, style: "width:100%;height:auto;border-radius:10px;display:block;touch-action:none;background:#f6dccb",
    role: "img", "aria-label": L("血管與組織的發炎模擬", "Simulation of inflammation in tissue") }, wrap);
  var ctx = cv.getContext("2d"); ctx.scale(2, 2);
  var signs = null;
  if (level !== "L1") {
    signs = H.el("div", { style: "display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px;font-size:.88em" }, wrap);
  }
  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  var bStart = H.el("button", { type: "button", class: "ix-btn", style: "font-weight:700", text: L("🌹 插入一根帶細菌的刺", "🌹 Insert a dirty thorn") }, ctr);
  var bAb = H.el("button", { type: "button", class: "ix-btn", text: L("🅨 抗體幫忙標記細菌", "🅨 Antibodies tag bacteria") }, ctr);
  var bPause = H.el("button", { type: "button", class: "ix-btn", text: L("⏸ 暫停", "⏸ Pause") }, ctr);
  var state = { started: false, antibody: false, paused: false, divide: 1, t: 0 };
  if (level !== "L1") {
    var lab = H.el("label", {}, ctr);
    H.el("span", { text: L("細菌分裂速度", "Bacterial growth") }, lab);
    var inp = H.el("input", { type: "range", min: 0.5, max: 4, step: 0.1, value: 1, id: id + "-div" }, lab);
    var out = H.el("span", { class: "ix-readout", text: "×1.0" }, lab);
    inp.addEventListener("input", function () { state.divide = +inp.value; out.textContent = "×" + state.divide.toFixed(1); });
  }
  var chart = null;
  if (level === "L3") {
    H.el("p", { text: L("細菌與組織中白血球的數量變化", "Bacteria and neutrophils in tissue over time"), style: "margin:12px 0 2px;font-weight:700" }, wrap);
    chart = H.svg("svg", { viewBox: "0 0 600 140", class: "ix-svg", role: "img", "aria-label": L("族群數量變化圖", "Population chart") }, wrap);
  }
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0;line-height:1.7" }, wrap);

  // ---------- 狀態 ----------
  var sig, bac, neu, rbc, user, history, inflam;
  function reset() {
    sig = new Float32Array(GX * GY);
    bac = []; neu = []; rbc = []; history = []; inflam = 0; state.t = 0;
    for (var i = 0; i < 26; i++) rbc.push({ x: Math.random() * W, y: 0.2 + Math.random() * 0.6, blood: true });
    for (i = 0; i < 6; i++) neu.push({ x: Math.random() * W, y: 0.5, inVessel: true, life: 0, ate: 0, dead: false });
    user = level === "L1" ? { x: 120, y: 300, dragging: false } : null;
  }
  function start() {
    reset(); state.started = true;
    for (var i = 0; i < 30; i++) bac.push({ x: WOUND.x + (Math.random() - 0.5) * 30, y: WOUND.y + (Math.random() - 0.5) * 30, timer: Math.random() * 300, tag: false });
  }
  reset();

  function vesselTop() { return 18; }
  function vesselH() { return 44 + 26 * inflam; }
  function idx(x, y) { var gx = Math.max(0, Math.min(GX - 1, Math.floor(x / CELL))), gy = Math.max(0, Math.min(GY - 1, Math.floor(y / CELL))); return gy * GX + gx; }

  function step() {
    state.t++;
    // 訊號：擴散＋衰減＋來源
    var ns = new Float32Array(GX * GY), D = 0.22, decay = 0.004;
    for (var gy = 0; gy < GY; gy++) for (var gx = 0; gx < GX; gx++) {
      var k = gy * GX + gx, c = sig[k];
      var lap = (gx > 0 ? sig[k - 1] : c) + (gx < GX - 1 ? sig[k + 1] : c) + (gy > 0 ? sig[k - GX] : c) + (gy < GY - 1 ? sig[k + GX] : c) - 4 * c;
      ns[k] = c + D * lap - decay * c;
    }
    sig = ns;
    if (state.started) {
      sig[idx(WOUND.x, WOUND.y)] += state.t < 300 ? 4 : 0.4; // 受傷的組織放出的訊號
      bac.forEach(function (b) { sig[idx(b.x, b.y)] += 0.35; });
    }
    // 發炎程度：血管下緣靠近傷口處的訊號
    var wall = 0, vb = vesselTop() + vesselH();
    for (var x = WOUND.x - 120; x <= WOUND.x + 120; x += CELL) wall += sig[idx(x, vb + 6)];
    inflam += (Math.min(1, wall / 12) - inflam) * 0.02;

    // 紅血球流動
    rbc.forEach(function (r) { r.x += 1.6 - 0.5 * inflam; if (r.x > W + 10) r.x = -10; });
    // 白血球
    // 發炎越厲害，血液裡流過的白血球越多（骨髓釋放、血流變慢）
    var inTissue = neu.filter(function (n) { return !n.inVessel && !n.dead; }).length;
    if (neu.filter(function (n) { return n.inVessel; }).length < 6 + 8 * inflam && Math.random() < 0.02 + 0.05 * inflam) neu.push({ x: -10, y: 0.3 + Math.random() * 0.4, inVessel: true, life: 0, ate: 0, dead: false });
    neu.forEach(function (n) {
      if (n.dead) { n.life++; return; }
      if (n.inVessel) {
        var s = sig[idx(n.x, vb + 6)];
        n.x += s > 0.15 ? 0.5 : 1.4; // 訊號強的地方會「滾動」變慢，貼著血管壁
        if (n.x > W + 10) n.x = -10;
        if (s > 0.15 && inTissue < 40 && Math.random() < 0.012 * (0.3 + inflam)) { inTissue++; n.inVessel = false; n.x = n.x; n.y = vb + 4; } // 鑽出血管（血球滲出）
        return;
      }
      n.life++;
      var k = idx(n.x, n.y), gx = (sig[Math.min(k + 1, sig.length - 1)] - sig[Math.max(k - 1, 0)]), gy2 = (sig[Math.min(k + GX, sig.length - 1)] - sig[Math.max(k - GX, 0)]);
      var gl = Math.hypot(gx, gy2);
      var vx = (Math.random() - 0.5) * 0.8, vy = (Math.random() - 0.5) * 0.8;
      if (gl > 1e-4) { vx += 0.45 * gx / gl; vy += 0.45 * gy2 / gl; }
      n.x = Math.max(4, Math.min(W - 4, n.x + vx)); n.y = Math.max(vb + 4, Math.min(Hh - 4, n.y + vy));
      eatNear(n, 10, 0.025);
      if (n.ate >= 14 || n.life > 2400) { n.dead = true; n.life = 0; } // 吃飽或老了就死掉，變成膿的一部分
    });
    neu = neu.filter(function (n) { return !(n.dead && n.life > 900); });
    if (user && user.dragging) eatNear(user, 16, 1);
    // 細菌
    var cap = 260, add = [];
    bac.forEach(function (b) {
      b.x += (Math.random() - 0.5) * 0.6; b.y += (Math.random() - 0.5) * 0.6;
      b.y = Math.max(vb + 4, Math.min(Hh - 3, b.y)); b.x = Math.max(3, Math.min(W - 3, b.x));
      b.timer += state.divide;
      if (b.timer > 600 && bac.length + add.length < cap) { b.timer = Math.random() * 60; add.push({ x: b.x + 4, y: b.y + (Math.random() - 0.5) * 4, timer: Math.random() * 60, tag: b.tag }); }
      if (state.antibody && !b.tag && Math.random() < 0.004 * (0.5 + inflam)) b.tag = true;
    });
    bac = bac.concat(add);
    if (state.t % 30 === 0) history.push([bac.length, neu.filter(function (n) { return !n.inVessel && !n.dead; }).length]);
    if (history.length > 200) history.shift();
  }
  function eatNear(n, r, p) {
    for (var i = bac.length - 1; i >= 0; i--) {
      var b = bac[i];
      if (Math.abs(b.x - n.x) < r && Math.abs(b.y - n.y) < r && Math.random() < (b.tag ? p * 3.5 : p)) { bac.splice(i, 1); n.ate = (n.ate || 0) + 1; }
    }
  }

  // ---------- 繪圖 ----------
  function draw() {
    var vt = vesselTop(), vh = vesselH(), vb = vt + vh;
    ctx.clearRect(0, 0, W, Hh);
    // 組織
    ctx.fillStyle = "#f6dccb"; ctx.fillRect(0, 0, W, Hh);
    // 組織細胞（背景）
    ctx.strokeStyle = "rgba(160,110,90,.25)"; ctx.lineWidth = 1;
    for (var gx = 0; gx < 12; gx++) for (var gy = 0; gy < 6; gy++) {
      var cx = 25 + gx * 50 + (gy % 2) * 25, cy = vb + 30 + gy * 52;
      if (cy > Hh) continue;
      ctx.beginPath(); ctx.ellipse(cx, cy, 20, 15, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 發紅（血管擴張）與腫（滲出的液體）
    var grd = ctx.createRadialGradient(WOUND.x, WOUND.y, 10, WOUND.x, WOUND.y, 260);
    grd.addColorStop(0, "rgba(220,60,60," + (0.35 * inflam) + ")"); grd.addColorStop(1, "rgba(220,60,60,0)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, Hh);
    var grd2 = ctx.createRadialGradient(WOUND.x, WOUND.y - 40, 10, WOUND.x, WOUND.y - 40, 200);
    grd2.addColorStop(0, "rgba(140,190,230," + (0.25 * inflam) + ")"); grd2.addColorStop(1, "rgba(140,190,230,0)");
    ctx.fillStyle = grd2; ctx.fillRect(0, vb, W, Hh - vb);
    // 訊號（L2 以上，淡淡的紫色）
    if (level !== "L1") {
      for (var k = 0; k < sig.length; k++) {
        var v = Math.min(1, sig[k] / 2); if (v < 0.03) continue;
        ctx.fillStyle = "rgba(150,90,200," + (v * 0.28) + ")";
        ctx.fillRect((k % GX) * CELL, Math.floor(k / GX) * CELL, CELL, CELL);
      }
    }
    // 血管
    ctx.fillStyle = "#c2414a"; ctx.fillRect(0, vt, W, vh);
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(0, vt + 4, W, 4);
    ctx.strokeStyle = "#7a2630"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, vt); ctx.lineTo(W, vt); ctx.moveTo(0, vb); ctx.lineTo(W, vb); ctx.stroke();
    rbc.forEach(function (r) { ctx.fillStyle = "#e66a6a"; ctx.beginPath(); ctx.ellipse(r.x, vt + r.y * vh, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); });
    // 刺
    if (state.started) {
      ctx.fillStyle = "#6b8e3d"; ctx.strokeStyle = "#3a2e2a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(WOUND.x - 4, Hh); ctx.lineTo(WOUND.x + 26, Hh); ctx.lineTo(WOUND.x + 4, WOUND.y - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // 細菌
    bac.forEach(function (b) {
      ctx.fillStyle = "#4f9a3a"; ctx.beginPath(); ctx.ellipse(b.x, b.y, 4.5, 2.4, 0.6, 0, Math.PI * 2); ctx.fill();
      if (b.tag) {
        ctx.strokeStyle = "#e0a400"; ctx.lineWidth = 1.4; ctx.beginPath();
        ctx.moveTo(b.x, b.y - 3); ctx.lineTo(b.x, b.y - 7); ctx.moveTo(b.x, b.y - 7); ctx.lineTo(b.x - 2.5, b.y - 10); ctx.moveTo(b.x, b.y - 7); ctx.lineTo(b.x + 2.5, b.y - 10); ctx.stroke();
      }
    });
    // 白血球
    neu.forEach(function (n) {
      var y = n.inVessel ? vt + n.y * vh : n.y;
      if (n.dead) { ctx.fillStyle = "rgba(230,215,150," + Math.max(0, 0.8 - n.life / 1200) + ")"; ctx.beginPath(); ctx.arc(n.x, y, 6, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.fillStyle = "#fbf6ee"; ctx.strokeStyle = "#3a2e2a"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(n.x, y, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#9b7cc8";
      [[-3, 1], [0, 2.5], [3, 0.5]].forEach(function (o) { ctx.beginPath(); ctx.arc(n.x + o[0], y + o[1], 2.2, 0, Math.PI * 2); ctx.fill(); });
    });
    // 使用者的小噬
    if (user) {
      ctx.fillStyle = "#fffaf0"; ctx.strokeStyle = "#e0663a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(user.x, user.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#3a2e2a"; ctx.beginPath(); ctx.arc(user.x - 5, user.y - 3, 2, 0, Math.PI * 2); ctx.arc(user.x + 5, user.y - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(user.x, user.y + 2, 5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.fillStyle = "#3a2e2a"; ctx.font = "12px sans-serif"; ctx.fillText(L("小噬（拖我）", "Drag me"), user.x - 30, user.y + 30);
    }
    // 標籤
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.fillText(L("血管", "Blood vessel"), 10, vt + 18);
    ctx.fillStyle = "#6b4b3e"; ctx.font = "13px sans-serif"; ctx.fillText(L("組織", "Tissue"), 10, Hh - 10);

    // 四大徵象
    if (signs) {
      signs.innerHTML = "";
      [[L("紅", "Redness"), inflam], [L("熱", "Heat"), inflam * 0.9], [L("腫", "Swelling"), Math.min(1, inflam * 1.1)], [L("痛", "Pain"), Math.min(1, inflam * 0.8 + (state.started && state.t < 300 ? 0.3 : 0))]].forEach(function (s) {
        var box = H.el("div", {}, signs);
        H.el("div", { text: s[0] }, box);
        var tr = H.el("div", { style: "height:8px;border-radius:4px;background:var(--rule);overflow:hidden" }, box);
        H.el("div", { style: "height:100%;width:" + Math.round(s[1] * 100) + "%;background:#c2414a" }, tr);
      });
    }
    if (chart) drawChart();

    var tissueN = neu.filter(function (n) { return !n.inVessel && !n.dead; }).length;
    var t;
    if (!state.started) t = L("按「插入一根帶細菌的刺」開始。", "Press the thorn button to start.");
    else if (bac.length === 0) t = L("🎉 細菌全部被吃光了！發炎慢慢消退，組織開始修復。", "🎉 All bacteria cleared! The inflammation fades and repair begins.");
    else if (bac.length >= 250) t = L("😷 細菌太多了，感染擴散開來。試試打開抗體標記，或把細菌分裂速度調慢。", "😷 The infection is spreading. Try antibody tagging.");
    else t = L("細菌 ", "Bacteria ") + bac.length + L(" 隻　組織裡的白血球 ", "　neutrophils in tissue ") + tissueN + L(" 個", "") +
      (level === "L1" ? L("　拖曳小噬去吃掉綠色的細菌！", "　Drag Nuo's helper to eat the green bacteria!") : "") +
      (state.antibody ? L("　有黃色 Y 標記的細菌更容易被吞掉。", "　Tagged bacteria are eaten faster.") : "");
    msg.textContent = t;
  }
  function drawChart() {
    chart.innerHTML = "";
    var M = { l: 36, r: 70, t: 8, b: 20 }, pw = 600 - M.l - M.r, ph = 140 - M.t - M.b;
    var g = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, chart);
    H.svg("line", { x1: 0, y1: ph, x2: pw, y2: ph, stroke: "currentColor", opacity: 0.4 }, g);
    var maxV = 20; history.forEach(function (h) { maxV = Math.max(maxV, h[0], h[1]); });
    [[0, "#4f9a3a", L("細菌", "Bacteria")], [1, "#9b7cc8", L("白血球", "Neutrophils")]].forEach(function (sr) {
      if (history.length < 2) return;
      var d = history.map(function (h, i) { return (i ? "L" : "M") + (i / 199 * pw).toFixed(1) + " " + (ph - h[sr[0]] / maxV * ph).toFixed(1); }).join(" ");
      H.svg("path", { d: d, fill: "none", stroke: sr[1], "stroke-width": 2 }, g);
      var last = history[history.length - 1];
      var t = H.svg("text", { x: (history.length - 1) / 199 * pw + 6, y: ph - last[sr[0]] / maxV * ph + 4, "font-size": 11 }, g);
      t.textContent = sr[2] + " " + last[sr[0]];
    });
    var t2 = H.svg("text", { x: -6, y: 8, "text-anchor": "end", "font-size": 10 }, g); t2.textContent = maxV;
    var t3 = H.svg("text", { x: pw, y: ph + 15, "text-anchor": "end", "font-size": 10, opacity: 0.8 }, g); t3.textContent = L("時間 →", "time →");
  }

  // ---------- 互動 ----------
  bStart.addEventListener("click", function () { start(); });
  bAb.addEventListener("click", function () { state.antibody = !state.antibody; bAb.setAttribute("aria-pressed", String(state.antibody)); });
  bPause.addEventListener("click", function () { state.paused = !state.paused; bPause.textContent = state.paused ? L("▶ 繼續", "▶ Resume") : L("⏸ 暫停", "⏸ Pause"); });
  bAb.setAttribute("aria-pressed", "false");
  function toLocal(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * Hh }; }
  if (user !== null) {
    cv.addEventListener("pointerdown", function (e) { var p = toLocal(e); user.dragging = true; user.x = p.x; user.y = Math.max(vesselTop() + vesselH() + 10, p.y); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", function (e) { if (!user.dragging) return; var p = toLocal(e); user.x = p.x; user.y = Math.max(vesselTop() + vesselH() + 10, p.y); });
    cv.addEventListener("pointerup", function () { user.dragging = false; });
  }
  var visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
  function loop() {
    if (!state.paused && visible) { step(); step(); draw(); }
    requestAnimationFrame(loop);
  }
  draw();
  requestAnimationFrame(loop);
});
