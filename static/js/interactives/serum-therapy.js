/* 互動元件：血清療法（1901 馮・貝林）
 * 上半部：替馬打幾次小劑量的白喉毒素，看血液中的抗毒素量怎麼上升（追加注射時反應更快、更強）。
 * 下半部：病童喉嚨裡的白喉桿菌持續放出毒素。游離的毒素會慢慢鑽進細胞造成傷害，
 *         抗毒素只能中和「還在血液裡」的毒素，所以越早注射血清越好。
 *   L1：簡化的文字與笑臉
 *   L2：顯示游離毒素與已進入細胞的毒素曲線
 *   L3：加上血清劑量，並說明模型方程式 */
NobelIX.register("serum-therapy", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var wrap = H.el("div", {}, stage);

  // ---------- 上半部：免疫一匹馬 ----------
  H.el("p", { text: L("① 讓馬產生抗毒素：點時間軸，安排打針的日子（最多 5 次）", "① Immunize a horse: click the timeline to schedule injections (up to 5)"), style: "margin:0 0 4px;font-weight:700" }, wrap);
  var DAYS = 70, shots = [0, 21];
  var W = 600, H1 = 200, M = { l: 40, r: 14, t: 14, b: 30 }, pw = W - M.l - M.r, ph = H1 - M.t - M.b;
  var svgA = H.svg("svg", { viewBox: "0 0 " + W + " " + H1, class: "ix-svg", role: "img", style: "cursor:pointer",
    "aria-label": L("馬血液中的抗毒素量隨時間變化", "Antitoxin level in the horse over time") }, wrap);
  var msgA = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:4px 0 0" }, wrap);
  var ctrA = H.el("div", { class: "ix-controls" }, wrap);
  var bClear = H.el("button", { type: "button", class: "ix-btn", text: L("清除打針紀錄", "Clear injections") }, ctrA);
  bClear.addEventListener("click", function () { shots = []; drawA(); });

  function titer(t) {
    // 每一針的反應：第一針反應慢而弱；之後的追加針反應快而強（免疫記憶）
    var v = 0;
    shots.slice().sort(function (a, b) { return a - b; }).forEach(function (s, i) {
      var lag = i === 0 ? 7 : 3, peak = i === 0 ? 1 : Math.min(30, Math.pow(4, i)), dt = t - s - lag;
      if (dt > 0) v += peak * (1 - Math.exp(-dt / 2.5)) * Math.exp(-dt / 25);
    });
    return v;
  }
  var NEED = 8;
  function drawA() {
    svgA.innerHTML = "";
    var g = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, svgA);
    var maxV = 20; for (var t = 0; t <= DAYS; t++) maxV = Math.max(maxV, titer(t) * 1.1);
    function sx(t) { return t / DAYS * pw; } function sy(v) { return ph - v / maxV * ph; }
    H.svg("line", { x1: 0, y1: ph, x2: pw, y2: ph, stroke: "currentColor", opacity: 0.5 }, g);
    [0, 10, 20, 30, 40, 50, 60, 70].forEach(function (d) {
      var tx = H.svg("text", { x: sx(d), y: ph + 16, "text-anchor": "middle", "font-size": 11 }, g); tx.textContent = d;
    });
    var xl = H.svg("text", { x: pw, y: ph + 28, "text-anchor": "end", "font-size": 11, opacity: 0.8 }, g); xl.textContent = L("天", "day");
    H.svg("line", { x1: 0, y1: sy(NEED), x2: pw, y2: sy(NEED), stroke: "#2e8b57", "stroke-dasharray": "5 4" }, g);
    var tl = H.svg("text", { x: 4, y: sy(NEED) - 5, "font-size": 11, style: "fill:#2e8b57" }, g); tl.textContent = L("夠濃了，可以採血做血清", "strong enough to collect serum");
    var d = ""; for (t = 0; t <= DAYS; t += 0.5) d += (t ? "L" : "M") + sx(t).toFixed(1) + " " + sy(titer(t)).toFixed(1);
    H.svg("path", { d: d, fill: "none", stroke: "var(--field)", "stroke-width": 2.4 }, g);
    shots.forEach(function (s) {
      H.svg("line", { x1: sx(s), y1: 0, x2: sx(s), y2: ph, stroke: "#c0392b", "stroke-width": 1.5, opacity: 0.6 }, g);
      var tt = H.svg("text", { x: sx(s), y: 10, "text-anchor": "middle", "font-size": 14 }, g); tt.textContent = "💉";
    });
    var hit = H.svg("rect", { x: 0, y: 0, width: pw, height: ph, fill: "transparent" }, g);
    hit.addEventListener("click", function (e) {
      var pt = svgA.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(g.getScreenCTM().inverse());
      var day = Math.round(p.x / pw * DAYS);
      var near = shots.findIndex(function (s) { return Math.abs(s - day) <= 2; });
      if (near >= 0) shots.splice(near, 1); else if (shots.length < 5) shots.push(Math.max(0, Math.min(DAYS - 5, day)));
      drawA();
    });
    var best = 0; for (t = 0; t <= DAYS; t++) best = Math.max(best, titer(t));
    msgA.textContent = !shots.length ? L("點時間軸，替馬安排第一針。", "Click the timeline to schedule the first shot.")
      : best >= NEED ? L("✓ 抗毒素夠濃了！注意：第二針之後，反應比第一針快得多、也強得多。", "✓ Strong enough! Notice how booster shots work faster and stronger.")
      : L("抗毒素還不夠濃。試著隔一段時間再打一針（追加注射）。", "Not strong enough yet. Add a booster shot after a while.");
  }
  drawA();

  // ---------- 下半部：治療病童 ----------
  H.el("p", { text: L("② 治療白喉病童：發病後多久注射血清？", "② Treat a child with diphtheria: when do you give the serum?"), style: "margin:18px 0 4px;font-weight:700" }, wrap);
  var ctrB = H.el("div", { class: "ix-controls" }, wrap);
  var state = { delay: 24, dose: 5 };
  function slider(parent, label, key, min, max, step, fmt) {
    var lab = H.el("label", {}, parent);
    H.el("span", { text: label }, lab);
    var inp = H.el("input", { type: "range", min: min, max: max, step: step, value: state[key], id: id + "-" + key }, lab);
    var out = H.el("span", { class: "ix-readout", text: fmt(state[key]) }, lab);
    inp.addEventListener("input", function () { state[key] = +inp.value; out.textContent = fmt(state[key]); drawB(); });
  }
  slider(ctrB, L("發病後幾小時注射", "Hours after onset"), "delay", 0, 120, 6, function (v) { return v >= 120 ? L("不治療", "no serum") : v + L(" 小時", " h"); });
  if (level === "L3") slider(ctrB, L("血清劑量", "Serum dose"), "dose", 1, 20, 1, function (v) { return v + L(" 單位", " units"); });
  var svgB = H.svg("svg", { viewBox: "0 0 600 210", class: "ix-svg", role: "img", "aria-label": L("毒素變化圖", "Toxin over time") }, wrap);
  var face = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:6px 0 0;line-height:1.7" }, wrap);

  function simulate() {
    var P = 1, kb = 0.05, kn = 1, tau = 120, dt = 0.25, Tf = 0, Tc = 0, A = 0, out = [];
    for (var t = 0; t <= 144; t += dt) {
      if (state.delay < 120 && Math.abs(t - state.delay) < dt / 2) A += state.dose;
      var prod = t < 96 ? P : 0; // 細菌被清除前持續放出毒素
      var dTf = prod - kb * Tf - kn * A * Tf;
      Tc += kb * Tf * dt; Tf = Math.max(0, Tf + dTf * dt); A *= Math.exp(-dt / tau);
      if (Math.abs(t % 2) < dt / 2) out.push([t, Tf, Tc]);
    }
    return out;
  }
  function drawB() {
    var data = simulate(), damage = data[data.length - 1][2];
    svgB.innerHTML = "";
    var Mb = { l: 40, r: 110, t: 12, b: 30 }, w = 600 - Mb.l - Mb.r, h = 210 - Mb.t - Mb.b;
    var g = H.svg("g", { transform: "translate(" + Mb.l + " " + Mb.t + ")" }, svgB);
    var maxV = 100;
    function sx(t) { return t / 144 * w; } function sy(v) { return h - Math.min(v, maxV) / maxV * h; }
    H.svg("line", { x1: 0, y1: h, x2: w, y2: h, stroke: "currentColor", opacity: 0.5 }, g);
    [0, 24, 48, 72, 96, 120, 144].forEach(function (t) { var tx = H.svg("text", { x: sx(t), y: h + 16, "text-anchor": "middle", "font-size": 11 }, g); tx.textContent = t; });
    var xl = H.svg("text", { x: w, y: h + 28, "text-anchor": "end", "font-size": 11, opacity: 0.8 }, g); xl.textContent = L("發病後的小時數", "hours after onset");
    var series = level === "L1" ? [[2, "#c0392b", L("身體受到的傷害", "Damage")]] : [[1, "#e0a400", L("血液中的游離毒素（×4）", "Free toxin (×4)")], [2, "#c0392b", L("已鑽進細胞的毒素", "Toxin in cells")]];
    series.forEach(function (sr) {
      var d = data.map(function (p, i) { return (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(sr[0] === 1 ? p[1] * 4 : p[2]).toFixed(1); }).join(" ");
      H.svg("path", { d: d, fill: "none", stroke: sr[1], "stroke-width": 2.4 }, g);
      var last = data[data.length - 1];
      var lt = H.svg("text", { x: w + 6, y: sy(sr[0] === 1 ? last[1] * 4 : last[2]) + 4, "font-size": 11, style: "fill:" + sr[1] }, g); lt.textContent = sr[2];
    });
    if (state.delay < 120) {
      H.svg("line", { x1: sx(state.delay), y1: 0, x2: sx(state.delay), y2: h, stroke: "#2e8b57", "stroke-width": 2, "stroke-dasharray": "4 3" }, g);
      var st = H.svg("text", { x: sx(state.delay) + 4, y: 12, "font-size": 12, style: "fill:#2e8b57;font-weight:700" }, g); st.textContent = L("💉 血清", "💉 serum");
    }
    var verdict = damage < 20 ? L("😊 孩子很快就康復了。", "😊 The child recovers quickly.")
      : damage < 50 ? L("😟 孩子病得很重，但撐過來了。", "😟 Very ill, but survives.")
      : L("😢 太晚了：大部分毒素已經鑽進細胞，血清救不回來。", "😢 Too late: most toxin is already inside cells.");
    var extra = level === "L1" ? "" : L("　已進入細胞的毒素：", "　Toxin in cells: ") + damage.toFixed(0) + L("（抗毒素只能中和血液中的游離毒素）", " (antitoxin only neutralizes free toxin)");
    face.textContent = verdict + extra;
  }
  drawB();
});
