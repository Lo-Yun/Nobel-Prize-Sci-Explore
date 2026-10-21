/* 互動元件：放開免疫的煞車（2018 艾利森、本庶佑）
 * 腫瘤在組織中長大。T 細胞從左邊的血管進來，找到腫瘤細胞後把它殺掉。
 * 但很多腫瘤細胞表面有 PD-L1，碰到 T 細胞上的 PD-1 就像踩下煞車，讓 T 細胞「累了」不再攻擊。
 *   抗 PD-1 藥物：擋住 PD-1，煞車失效，T 細胞繼續攻擊（本庶佑）
 *   抗 CTLA-4 藥物：在淋巴結裡放開另一個煞車，讓更多 T 細胞被啟動、進入組織（艾利森）
 *   代價：放開煞車的 T 細胞，偶爾也會攻擊正常細胞（免疫相關副作用）
 * L1：遊戲化；L2：腫瘤大小曲線；L3：加上「腫瘤突變量」（新抗原越多，T 細胞越容易認出腫瘤） */
NobelIX.register("checkpoint-sim", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var W = 600, Hh = 340, G = 12, NX = Math.floor(W / G), NY = Math.floor(Hh / G);
  var wrap = H.el("div", {}, stage);
  var cv = H.el("canvas", { width: W * 2, height: Hh * 2, style: "width:100%;height:auto;border-radius:10px;display:block;background:#f3e4d6",
    role: "img", "aria-label": L("腫瘤與 T 細胞的模擬", "Tumour and T-cell simulation") }, wrap);
  var ctx = cv.getContext("2d"); ctx.scale(2, 2);
  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  var bPD1 = H.el("button", { type: "button", class: "ix-btn", text: L("💊 抗 PD-1 藥物", "💊 Anti-PD-1") }, ctr);
  var bCT = H.el("button", { type: "button", class: "ix-btn", text: L("💊 抗 CTLA-4 藥物", "💊 Anti-CTLA-4") }, ctr);
  var bReset = H.el("button", { type: "button", class: "ix-btn", text: L("↺ 重新開始", "↺ Restart") }, ctr);
  var state = { pd1: false, ctla4: false, tmb: 0.5, t: 0 };
  if (level === "L3") {
    var lab = H.el("label", {}, ctr);
    H.el("span", { text: L("腫瘤突變量（新抗原）", "Tumour mutations (neoantigens)") }, lab);
    var inp = H.el("input", { type: "range", min: 0.1, max: 1, step: 0.05, value: state.tmb, id: id + "-tmb" }, lab);
    var out = H.el("span", { class: "ix-readout", text: "0.50" }, lab);
    inp.addEventListener("input", function () { state.tmb = +inp.value; out.textContent = state.tmb.toFixed(2); });
  }
  var chart = null;
  if (level !== "L1") {
    H.el("p", { text: L("腫瘤細胞數量", "Tumour size"), style: "margin:10px 0 2px;font-weight:700" }, wrap);
    chart = H.svg("svg", { viewBox: "0 0 600 120", class: "ix-svg", role: "img", "aria-label": L("腫瘤細胞數量隨時間變化", "Tumour size over time") }, wrap);
  }
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0;line-height:1.7" }, wrap);

  var grid, tcells, history, damage, killed;
  function k(x, y) { return y * NX + x; }
  function reset() {
    grid = new Uint8Array(NX * NY); // 0 空、1 正常細胞、2 腫瘤、3 受損的正常細胞
    for (var y = 0; y < NY; y++) for (var x = 4; x < NX; x++) if (Math.random() < 0.55) grid[k(x, y)] = 1;
    var cx = Math.floor(NX * 0.62), cy = Math.floor(NY / 2);
    for (y = -5; y <= 5; y++) for (x = -5; x <= 5; x++) if (x * x + y * y <= 25) grid[k(cx + x, cy + y)] = 2;
    tcells = []; history = []; damage = 0; killed = 0; state.t = 0;
  }
  reset();
  // 每顆腫瘤細胞是否帶 PD-L1：用座標決定，讓它固定不變
  function hasPDL1(x, y) { return Math.abs((x * 73856093) ^ (y * 19349663)) % 10 < 7; }

  function step() {
    state.t++;
    // 腫瘤生長：隨機挑腫瘤細胞，長到旁邊的位置（擠掉正常細胞）
    var tl = [];
    for (var i = 0; i < grid.length; i++) if (grid[i] === 2) tl.push(i);
    var tumor = tl.length, attempts = tumor * 0.0012;
    attempts = Math.floor(attempts) + (Math.random() < attempts % 1 ? 1 : 0);
    for (var n = 0; n < attempts && tumor < 900; n++) {
      var idx = tl[Math.floor(Math.random() * tl.length)];
      var x = idx % NX, y = Math.floor(idx / NX), d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
      var nx = x + d[0], ny = y + d[1];
      if (nx > 3 && nx < NX && ny >= 0 && ny < NY && grid[k(nx, ny)] !== 2) grid[k(nx, ny)] = 2;
    }
    // T 細胞從左邊血管進來（抗 CTLA-4 讓更多 T 細胞被啟動）
    var rate = state.ctla4 ? 0.06 : 0.02, cap = state.ctla4 ? 80 : 40;
    if (tcells.length < cap && Math.random() < rate) tcells.push({ x: 20, y: Math.random() * Hh, tired: 0, life: 0, target: -1 });
    var tumorCells = [];
    for (i = 0; i < grid.length; i++) if (grid[i] === 2) tumorCells.push(i);
    tcells.forEach(function (c) {
      c.life++;
      if (c.tired > 0) { c.tired--; c.x += (Math.random() - 0.5); c.y += (Math.random() - 0.5); return; }
      if (c.rest > 0) { c.rest--; c.x += (Math.random() - 0.5); c.y += (Math.random() - 0.5); return; } // 殺完一顆要休息、補充武器
      // 每顆 T 細胞鎖定一顆腫瘤細胞前進；目標消失就換一個
      if (c.target < 0 || grid[c.target] !== 2) c.target = tumorCells.length ? tumorCells[Math.floor(Math.random() * tumorCells.length)] : -1;
      var tx = c.target >= 0 ? (c.target % NX) * G + G / 2 : W / 2, ty = c.target >= 0 ? Math.floor(c.target / NX) * G + G / 2 : Hh / 2;
      var dx = tx - c.x, dy = ty - c.y, dd = Math.hypot(dx, dy) || 1;
      c.x += dx / dd * 1.6 + (Math.random() - 0.5) * 1.5; c.y += dy / dd * 1.6 + (Math.random() - 0.5) * 1.5;
      if (c.target >= 0 && dd < G * 1.2 && Math.random() < 0.05) {
        var recog = level === "L3" ? state.tmb : 0.5;
        if (Math.random() > recog) { c.target = -1; return; } // 沒認出來，換一個目標
        var gx = c.target % NX, gy = Math.floor(c.target / NX);
        if (hasPDL1(gx, gy) && !state.pd1 && Math.random() < 0.85) { c.tired = 1500; return; } // 被踩煞車
        grid[c.target] = 0; killed++; c.target = -1; c.rest = 480;
        return;
      }
      var gx2 = Math.floor(c.x / G), gy2 = Math.floor(c.y / G);
      if (gx2 >= 0 && gx2 < NX && gy2 >= 0 && gy2 < NY && grid[k(gx2, gy2)] === 1 &&
          Math.random() < 0.0004 * ((state.pd1 ? 1 : 0) + (state.ctla4 ? 2 : 0))) { grid[k(gx2, gy2)] = 3; damage++; } // 副作用：攻擊正常細胞
    });
    tcells = tcells.filter(function (c) { return c.life < 2400; });
    if (state.t % 10 === 0) { history.push(tumor); if (history.length > 240) history.shift(); }
  }

  function draw() {
    ctx.fillStyle = "#f3e4d6"; ctx.fillRect(0, 0, W, Hh);
    ctx.fillStyle = "#c2414a"; ctx.fillRect(0, 0, 40, Hh);
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.save(); ctx.translate(26, Hh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(L("血管", "Vessel"), -14, 0); ctx.restore();
    for (var i = 0; i < grid.length; i++) {
      var v = grid[i]; if (!v) continue;
      var x = (i % NX) * G + G / 2, y = Math.floor(i / NX) * G + G / 2;
      ctx.beginPath(); ctx.arc(x, y, G * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = v === 1 ? "#e9cdb5" : v === 2 ? "#8a5a7a" : "#b0a8a0"; ctx.fill();
      if (v === 2 && hasPDL1(i % NX, Math.floor(i / NX))) { ctx.fillStyle = "#f2a33d"; ctx.beginPath(); ctx.arc(x + 3, y - 3, 1.8, 0, Math.PI * 2); ctx.fill(); }
      if (v === 3) { ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke(); }
    }
    tcells.forEach(function (c) {
      ctx.beginPath(); ctx.arc(c.x, c.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = c.tired > 0 ? "#b8c3cf" : "#3d8fd6"; ctx.fill();
      ctx.strokeStyle = "#1f3b5c"; ctx.lineWidth = 1; ctx.stroke();
      if (c.tired > 0) { ctx.fillStyle = "#1f3b5c"; ctx.font = "9px sans-serif"; ctx.fillText("z", c.x + 5, c.y - 5); }
    });
    // 圖例
    ctx.font = "11px sans-serif"; ctx.fillStyle = "#3a2e2a";
    var lg = [["#8a5a7a", L("腫瘤細胞", "tumour")], ["#f2a33d", L("PD-L1（煞車訊號）", "PD-L1")], ["#3d8fd6", L("T 細胞", "T cell")], ["#b8c3cf", L("被踩煞車的 T 細胞", "braked T cell")]];
    lg.forEach(function (e, j) { ctx.fillStyle = e[0]; ctx.beginPath(); ctx.arc(56 + j * 132, Hh - 12, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#3a2e2a"; ctx.fillText(e[1], 64 + j * 132, Hh - 8); });

    if (chart) {
      chart.innerHTML = "";
      var M = { l: 36, r: 10, t: 6, b: 16 }, pw = 600 - M.l - M.r, ph = 120 - M.t - M.b;
      var g = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, chart);
      H.svg("line", { x1: 0, y1: ph, x2: pw, y2: ph, stroke: "currentColor", opacity: 0.4 }, g);
      var maxV = 200; history.forEach(function (v) { maxV = Math.max(maxV, v); });
      if (history.length > 1) {
        var d = history.map(function (v, j) { return (j ? "L" : "M") + (j / 239 * pw).toFixed(1) + " " + (ph - v / maxV * ph).toFixed(1); }).join(" ");
        H.svg("path", { d: d, fill: "none", stroke: "#8a5a7a", "stroke-width": 2 }, g);
      }
      var t1 = H.svg("text", { x: -6, y: 8, "text-anchor": "end", "font-size": 10 }, g); t1.textContent = maxV;
      var t2 = H.svg("text", { x: -6, y: ph, "text-anchor": "end", "font-size": 10 }, g); t2.textContent = 0;
    }
    var tumor = 0; for (i = 0; i < grid.length; i++) if (grid[i] === 2) tumor++;
    var tired = tcells.filter(function (c) { return c.tired > 0; }).length;
    var t;
    if (tumor === 0) t = L("🎉 腫瘤細胞全部被清除了！", "🎉 The tumour is gone!");
    else {
      t = L("腫瘤細胞 ", "Tumour cells ") + tumor + L("　T 細胞 ", "　T cells ") + tcells.length + L("（被踩煞車 ", " (braked ") + tired + L("）", ")");
      if (!state.pd1 && !state.ctla4) t += L("　很多 T 細胞碰到腫瘤上的橘色 PD-L1 就停下來了。試試看放開煞車！", "　Many T cells stop at the orange PD-L1. Try releasing the brakes!");
    }
    if (state.pd1 || state.ctla4) t += L("　副作用：受損的正常細胞 ", "　Side effects: damaged normal cells ") + damage;
    msg.textContent = t;
    bPD1.setAttribute("aria-pressed", String(state.pd1)); bCT.setAttribute("aria-pressed", String(state.ctla4));
  }
  bPD1.addEventListener("click", function () { state.pd1 = !state.pd1; tcells.forEach(function (c) { if (state.pd1) c.tired = 0; }); });
  bCT.addEventListener("click", function () { state.ctla4 = !state.ctla4; });
  bReset.addEventListener("click", reset);
  var visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
  function loop() { if (visible) { step(); step(); draw(); } requestAnimationFrame(loop); }
  draw(); requestAnimationFrame(loop);
});
