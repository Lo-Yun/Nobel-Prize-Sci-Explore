/* 互動元件：布拉格定律（1915 布拉格父子）
 * X 光從一層一層的原子平面反射。從第二層反射的光要多走 2d sinθ 的路，
 * 剛好多走整數個波長時，所有反射光「齊步」，偵測器就會看到很亮的反射。
 *   L1：只調角度，看兩道波有沒有對齊（笑臉表示很亮）
 *   L2：顯示多走的路徑 2d sinθ、可調晶面間距 d 與波長 λ
 *   L3：加上「強度對角度」的掃描圖與實際晶體／X 光管的預設值 */
NobelIX.register("bragg-law", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var INK = "#3a2e2a", BEAM = "#7a5cf0", BEAM2 = "#e0663a";
  var N_PLANES = 8; // 計算強度時考慮的原子平面數
  var state = { theta: 20, d: 0.282, lam: 0.154 };
  if (level === "L1") state.theta = 12;

  var wrap = H.el("div", {}, stage);
  var W = 600, Hh = 330, PX = 230; // 1 nm = 230 px
  var svg = H.svg("svg", { viewBox: "0 0 " + W + " " + Hh, class: "ix-svg", role: "img",
    "aria-label": L("X 光從晶體平面反射的示意圖", "X-rays reflecting from crystal planes") }, wrap);
  H.sketchDefs(svg, id);
  var gPlanes = H.svg("g", {}, svg), gRays = H.svg("g", {}, svg), gUI = H.svg("g", {}, svg);

  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  function slider(label, key, min, max, step, fmt) {
    var lab = H.el("label", {}, ctr);
    H.el("span", { text: label }, lab);
    var inp = H.el("input", { type: "range", min: min, max: max, step: step, value: state[key], id: id + "-" + key }, lab);
    var out = H.el("span", { class: "ix-readout" }, lab);
    function sync() { inp.value = state[key]; out.textContent = fmt(state[key]); }
    inp.addEventListener("input", function () { state[key] = +inp.value; render(); });
    return sync;
  }
  var syncs = [slider(L("入射角 θ", "Angle θ"), "theta", 3, 75, 0.5, function (v) { return v.toFixed(1) + "°"; })];
  if (level !== "L1") {
    syncs.push(slider(L("晶面間距 d", "Plane spacing d"), "d", 0.15, 0.45, 0.002, function (v) { return v.toFixed(3) + " nm"; }));
    syncs.push(slider(L("波長 λ", "Wavelength λ"), "lam", 0.05, 0.25, 0.001, function (v) { return v.toFixed(3) + " nm"; }));
  }
  if (level === "L3") {
    var pre = H.el("div", { class: "ix-controls" }, wrap);
    H.el("span", { text: L("代入實際數值：", "Presets: ") }, pre);
    [[L("食鹽 NaCl (200) 面", "NaCl (200)"), "d", 0.282], [L("矽 Si (111) 面", "Si (111)"), "d", 0.3135],
     [L("銅靶 Kα", "Cu Kα"), "lam", 0.1541], [L("鉬靶 Kα", "Mo Kα"), "lam", 0.0711]].forEach(function (p) {
      var b = H.el("button", { type: "button", class: "ix-btn", text: p[0] }, pre);
      b.addEventListener("click", function () { state[p[1]] = p[2]; render(); });
    });
    H.el("p", { text: L("強度對入射角（轉動晶體掃描）", "Intensity vs. angle (rotating the crystal)"), style: "margin:12px 0 2px;font-weight:700" }, wrap);
    var svgP = H.svg("svg", { viewBox: "0 0 600 170", class: "ix-svg", role: "img", "aria-label": L("強度隨角度變化的圖", "Intensity vs angle") }, wrap);
  }
  var readout = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:10px 0 0;line-height:1.7" }, wrap);

  function intensity(theta, d, lam) {
    var delta = 2 * Math.PI * 2 * d * Math.sin(theta * Math.PI / 180) / lam;
    var s = Math.sin(delta / 2);
    if (Math.abs(s) < 1e-6) return 1;
    var num = Math.sin(N_PLANES * delta / 2);
    return (num * num) / (N_PLANES * N_PLANES * s * s);
  }

  // 沿著直線畫正弦波
  function wavePath(x0, y0, dx, dy, len, lamPx, phase, amp) {
    var nx = -dy, ny = dx, d = "";
    for (var s = 0; s <= len; s += 2) {
      var w = amp * Math.sin(2 * Math.PI * s / lamPx + phase);
      d += (s ? "L" : "M") + (x0 + dx * s + nx * w).toFixed(1) + " " + (y0 + dy * s + ny * w).toFixed(1);
    }
    return d;
  }

  function render() {
    syncs.forEach(function (f) { f(); });
    var th = state.theta * Math.PI / 180;
    var dPx = state.d * PX, lamPx = state.lam * PX;
    var y1 = 150, y2 = y1 + dPx, X = 300;

    // 原子平面
    gPlanes.innerHTML = "";
    var planeCount = Math.max(3, Math.ceil((Hh - y1) / dPx) + 1);
    var spacing = Math.max(18, dPx * 0.9);
    for (var i = 0; i < planeCount; i++) {
      var y = y1 + i * dPx;
      if (y > Hh + 10) break;
      H.svg("line", { x1: 30, y1: y, x2: W - 30, y2: y, stroke: "currentColor", "stroke-width": 1, opacity: 0.25, "stroke-dasharray": "4 6" }, gPlanes);
      for (var x = 40 + (i % 2) * spacing / 2; x < W - 30; x += spacing)
        H.svg("circle", { cx: x, cy: y, r: 6, fill: i % 2 ? "#a77fd6" : "#6cbf84", stroke: INK, "stroke-width": 1.2 }, gPlanes);
    }

    // 光線：入射 (cosθ, sinθ)，反射 (cosθ, -sinθ)
    gRays.innerHTML = "";
    var din = [Math.cos(th), Math.sin(th)], dout = [Math.cos(th), -Math.sin(th)];
    var Lin = 260, Lout = 260;
    // 相位用平面波來算：入射光在點 P 的相位 = 2π (P·din) / λ；
    // 反射後在反射點 Q 接續，所以兩道反射光的相位差剛好是 2π · 2d sinθ / λ。
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
    [[X, y1, BEAM], [X, y2, BEAM2]].forEach(function (r) {
      var Q = [r[0], r[1]];
      var S = [Q[0] - din[0] * Lin, Q[1] - din[1] * Lin];
      var k = 2 * Math.PI / lamPx;
      H.svg("path", { d: wavePath(S[0], S[1], din[0], din[1], Lin, lamPx, k * dot(S, din), 5), fill: "none", stroke: r[2], "stroke-width": 2.2 }, gRays);
      H.svg("path", { d: wavePath(Q[0], Q[1], dout[0], dout[1], Lout, lamPx, k * dot(Q, din), 5), fill: "none", stroke: r[2], "stroke-width": 2.2 }, gRays);
      H.svg("circle", { cx: Q[0], cy: Q[1], r: 4, fill: r[2] }, gRays);
    });

    // 多走的路徑（L2 以上）
    gUI.innerHTML = "";
    if (level !== "L1") {
      var ax = X - din[0] * dPx * Math.sin(th), ay = y2 - din[1] * dPx * Math.sin(th);
      var bx = X + dout[0] * dPx * Math.sin(th), by = y2 + dout[1] * dPx * Math.sin(th);
      H.svg("path", { d: "M" + ax + " " + ay + " L" + X + " " + y2 + " L" + bx + " " + by, fill: "none", stroke: "#f2b33d", "stroke-width": 6, opacity: 0.75, "stroke-linecap": "round" }, gUI);
      H.svg("line", { x1: X, y1: y1, x2: ax, y2: ay, stroke: "currentColor", "stroke-dasharray": "3 3", opacity: 0.6 }, gUI);
      H.svg("line", { x1: X, y1: y1, x2: bx, y2: by, stroke: "currentColor", "stroke-dasharray": "3 3", opacity: 0.6 }, gUI);
      var tl = H.svg("text", { x: X + 12, y: (y1 + y2) / 2 + 4, "font-size": 12 }, gUI); tl.textContent = "d";
      var te = H.svg("text", { x: X - 10, y: y2 + 26, "text-anchor": "middle", "font-size": 12 }, gUI);
      te.textContent = L("多走的路 = 2d sinθ", "extra path = 2d sinθ");
    }

    // 偵測器
    var I = intensity(state.theta, state.d, state.lam);
    var dx0 = X + dout[0] * Lout, dy0 = y1 + dout[1] * Lout;
    var det = H.svg("g", { transform: "translate(" + Math.min(W - 40, dx0) + " " + Math.max(26, dy0) + ")" }, gUI);
    H.svg("circle", { r: 22, fill: "#fff6c8", opacity: 0.2 + 0.8 * I, stroke: INK, "stroke-width": 2 }, det);
    if (level === "L1") {
      var face = I > 0.5 ? "M-8 4 Q0 13 8 4" : "M-8 8 L8 8";
      H.svg("circle", { cx: -7, cy: -5, r: 2.6, fill: INK }, det);
      H.svg("circle", { cx: 7, cy: -5, r: 2.6, fill: INK }, det);
      H.svg("path", { d: face, fill: "none", stroke: INK, "stroke-width": 2.4, "stroke-linecap": "round" }, det);
    } else {
      var td = H.svg("text", { y: 4, "text-anchor": "middle", "font-size": 11, style: "font-weight:700;fill:#3a2e2a" }, det);
      td.textContent = Math.round(I * 100) + "%";
    }
    var lab = H.svg("text", { x: 20, y: 24, "font-size": 12 }, gUI);
    lab.textContent = L("X 光從左上方射入，被一層層原子反射", "X-rays come in from the upper left and reflect off the atomic layers");

    // 讀數
    var path = 2 * state.d * Math.sin(th);
    var n = path / state.lam;
    var msg;
    if (level === "L1") {
      msg = I > 0.5
        ? L("兩道波對齊了（波峰對波峰），反射光變得好亮！", "The two waves line up — a bright reflection!")
        : L("兩道波沒有對齊，互相抵消，偵測器很暗。慢慢轉動角度，找找看哪裡會變亮。", "The waves don't line up and cancel out. Turn the angle slowly to find a bright spot.");
    } else {
      msg = "2d sinθ = " + path.toFixed(4) + " nm = " + n.toFixed(2) + " λ　" +
        (Math.abs(n - Math.round(n)) < 0.05 && Math.round(n) > 0
          ? L("→ 剛好是整數倍（n = ", "→ an integer multiple (n = ") + Math.round(n) + L("），建設性干涉！", "): constructive interference!")
          : L("→ 不是整數倍，各層反射互相抵消。", "→ not an integer: the reflections cancel."));
    }
    readout.textContent = msg;

    if (svgP) drawScan();
  }

  function drawScan() {
    svgP.innerHTML = "";
    var M = { l: 40, r: 14, t: 10, b: 30 }, pw = 600 - M.l - M.r, ph = 170 - M.t - M.b;
    var g = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, svgP);
    H.svg("line", { x1: 0, y1: ph, x2: pw, y2: ph, stroke: "currentColor", opacity: 0.5 }, g);
    [0, 15, 30, 45, 60, 75, 90].forEach(function (v) {
      var x = v / 90 * pw;
      H.svg("line", { x1: x, y1: 0, x2: x, y2: ph, stroke: "currentColor", opacity: 0.08 }, g);
      var t = H.svg("text", { x: x, y: ph + 16, "text-anchor": "middle", "font-size": 11 }, g); t.textContent = v + "°";
    });
    var d = "";
    for (var a = 0.2; a <= 90; a += 0.1) {
      var I = intensity(a, state.d, state.lam);
      d += (d ? "L" : "M") + (a / 90 * pw).toFixed(1) + " " + (ph - I * ph * 0.92).toFixed(1);
    }
    H.svg("path", { d: d, fill: "none", stroke: "var(--field)", "stroke-width": 2 }, g);
    // 標出各階布拉格角
    for (var n = 1; n < 8; n++) {
      var s = n * state.lam / (2 * state.d);
      if (s > 1) break;
      var ang = Math.asin(s) * 180 / Math.PI;
      var t2 = H.svg("text", { x: ang / 90 * pw, y: 12, "text-anchor": "middle", "font-size": 11, style: "font-weight:600" }, g);
      t2.textContent = "n=" + n;
    }
    var cx = state.theta / 90 * pw, cy = ph - intensity(state.theta, state.d, state.lam) * ph * 0.92;
    H.svg("line", { x1: cx, y1: 0, x2: cx, y2: ph, stroke: "currentColor", "stroke-dasharray": "3 3", opacity: 0.6 }, g);
    H.svg("circle", { cx: cx, cy: cy, r: 5, fill: "var(--field)", stroke: "var(--paper-2)", "stroke-width": 2 }, g);
    var xl = H.svg("text", { x: pw, y: ph + 28, "text-anchor": "end", "font-size": 11, opacity: 0.8 }, g); xl.textContent = L("入射角 θ", "angle θ");
  }
  render();
});
