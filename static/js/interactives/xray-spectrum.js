/* 互動元件：X 光管能譜與影像對比（L3 學者）
 *
 * 能譜模型（示意，非精確模擬）：
 *   連續譜（制動輻射）用 Kramers 定律：I(E) ∝ Z (E0 − E)，E0 = 管電壓 × e
 *   特性譜線：鎢靶 Kα ≈ 59.3 keV、Kβ ≈ 67.2 keV，管電壓高於 K 層結合能 69.5 kV 才出現
 *   過濾：I(E) × exp(−(μ/ρ)_Al ρ_Al t)
 * 對比：比較「10 cm 軟組織」與「9 cm 軟組織 + 1 cm 皮質骨」的穿透能量。
 * 質量衰減係數 μ/ρ（cm²/g）取自 NIST XCOM / X-ray Mass Attenuation Coefficients 表（四捨五入），
 * 中間能量用 log-log 內插。 */
NobelIX.register("xray-spectrum", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var E_TAB = [10, 15, 20, 30, 40, 50, 60, 80, 100, 150];
  var MU = {
    water: [5.329, 1.673, 0.8096, 0.3756, 0.2683, 0.2269, 0.2059, 0.1837, 0.1707, 0.1505],
    bone:  [28.51, 9.032, 4.001, 1.331, 0.6655, 0.4242, 0.3148, 0.2229, 0.1855, 0.1480],
    al:    [26.23, 7.955, 3.441, 1.128, 0.5685, 0.3681, 0.2778, 0.2018, 0.1704, 0.1378]
  };
  var RHO = { water: 1.0, bone: 1.92, al: 2.699 };
  function mu(mat, E) {
    var t = MU[mat], i = 0;
    if (E <= E_TAB[0]) i = 0; else if (E >= E_TAB[E_TAB.length - 1]) i = E_TAB.length - 2;
    else while (E > E_TAB[i + 1]) i++;
    var x0 = Math.log(E_TAB[i]), x1 = Math.log(E_TAB[i + 1]);
    var y0 = Math.log(t[i]), y1 = Math.log(t[i + 1]);
    return Math.exp(y0 + (Math.log(E) - x0) * (y1 - y0) / (x1 - x0));
  }
  var DE = 0.5;
  function spectrum(kv, alMM) {
    var pts = [];
    for (var E = 5; E <= kv; E += DE) {
      var I = (kv - E) * Math.exp(-mu("al", E) * RHO.al * alMM / 10);
      pts.push([E, I]);
    }
    // 鎢的特性譜線（強度隨過電壓上升；示意）
    if (kv > 69.5) {
      var k = 0.35 * Math.pow(kv / 69.5 - 1, 1.5) * kv;
      [[58.0, 0.5], [59.3, 0.9], [67.2, 0.32]].forEach(function (ln) {
        var f = Math.exp(-mu("al", ln[0]) * RHO.al * alMM / 10);
        pts.forEach(function (p) { if (Math.abs(p[0] - ln[0]) < DE / 2 + 1e-9) p[1] += k * ln[1] * f; });
      });
    }
    return pts;
  }
  function transmitted(pts, layers) {
    var s = 0;
    pts.forEach(function (p) {
      var a = 0;
      layers.forEach(function (l) { a += mu(l[0], p[0]) * RHO[l[0]] * l[1]; });
      s += p[1] * Math.exp(-a);
    });
    return s;
  }
  function contrastAt(kv, al) {
    var pts = spectrum(kv, al);
    var tissue = transmitted(pts, [["water", 10]]);
    var bone = transmitted(pts, [["water", 9], ["bone", 1]]);
    return { tissue: tissue, bone: bone, C: (tissue - bone) / tissue, total: transmitted(pts, []) };
  }

  var state = { kv: 80, al: 2.5 };
  var wrap = H.el("div", {}, stage);

  // ---------- 控制 ----------
  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  function slider(label, key, min, max, step, unit) {
    var lab = H.el("label", {}, ctr);
    H.el("span", { text: label }, lab);
    var inp = H.el("input", { type: "range", min: min, max: max, step: step, value: state[key], id: id + "-" + key }, lab);
    var out = H.el("span", { class: "ix-readout" }, lab);
    function sync() { out.textContent = (+state[key]).toFixed(step < 1 ? 1 : 0) + " " + unit; }
    inp.addEventListener("input", function () { state[key] = +inp.value; sync(); render(); });
    sync();
  }
  slider(L("管電壓", "Tube voltage"), "kv", 30, 150, 1, "kV");
  slider(L("鋁過濾", "Al filter"), "al", 0.5, 6, 0.5, "mm");

  // ---------- 圖 1：能譜 ----------
  var W = 600, Hh = 250, M = { l: 52, r: 16, t: 26, b: 40 };
  var pw = W - M.l - M.r, ph = Hh - M.t - M.b;
  H.el("p", { text: L("圖 1　X 光管發出的能譜", "Fig. 1  Spectrum from the tube"), style: "margin:12px 0 2px;font-weight:700" }, wrap);
  var svg1 = H.svg("svg", { viewBox: "0 0 " + W + " " + Hh, class: "ix-svg", role: "img",
    "aria-label": L("X 光能譜圖，橫軸是光子能量，縱軸是相對強度", "X-ray spectrum") }, wrap);
  var g1 = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, svg1);
  var EMAX = 150;
  function sx(E) { return E / EMAX * pw; }
  function axis(g, xmax, xticks, xlab, ylab) {
    H.svg("line", { x1: 0, y1: ph, x2: pw, y2: ph, stroke: "currentColor", "stroke-width": 1, opacity: 0.5 }, g);
    xticks.forEach(function (v) {
      var x = v / xmax * pw;
      H.svg("line", { x1: x, y1: 0, x2: x, y2: ph, stroke: "currentColor", opacity: 0.08 }, g);
      var t = H.svg("text", { x: x, y: ph + 16, "text-anchor": "middle", "font-size": 12 }, g); t.textContent = v;
    });
    var xl = H.svg("text", { x: pw, y: ph + 34, "text-anchor": "end", "font-size": 12, opacity: 0.8 }, g); xl.textContent = xlab;
    var yl = H.svg("text", { x: 0, y: -10, "font-size": 12, opacity: 0.8 }, g); yl.textContent = ylab;
  }
  axis(g1, EMAX, [0, 25, 50, 75, 100, 125, 150], L("光子能量 E（keV）", "Photon energy E (keV)"), L("相對強度", "Relative intensity"));
  var area = H.svg("path", { fill: "var(--field)", opacity: 0.18 }, g1);
  var line = H.svg("path", { fill: "none", stroke: "var(--field)", "stroke-width": 2, "stroke-linejoin": "round" }, g1);
  var kmark = H.svg("g", {}, g1);
  var emaxMark = H.svg("g", {}, g1);
  var hover1 = H.svg("g", { "pointer-events": "none", opacity: 0 }, g1);
  var hLine = H.svg("line", { y1: 0, y2: ph, stroke: "currentColor", "stroke-width": 1, opacity: 0.5 }, hover1);
  var hDot = H.svg("circle", { r: 4, fill: "var(--field)", stroke: "var(--paper-2)", "stroke-width": 2 }, hover1);
  var hTxt = H.svg("text", { "font-size": 12, y: 12 }, hover1);
  var hit1 = H.svg("rect", { x: 0, y: 0, width: pw, height: ph, fill: "transparent" }, g1);

  // ---------- 圖 2：對比 vs 管電壓 ----------
  var H2 = 220, ph2 = H2 - M.t - M.b;
  H.el("p", { text: L("圖 2　骨頭和軟組織的對比，隨管電壓的變化", "Fig. 2  Bone/soft-tissue contrast vs. tube voltage"), style: "margin:16px 0 2px;font-weight:700" }, wrap);
  var svg2 = H.svg("svg", { viewBox: "0 0 " + W + " " + H2, class: "ix-svg", role: "img",
    "aria-label": L("對比度隨管電壓下降的曲線", "Contrast vs voltage") }, wrap);
  var g2 = H.svg("g", { transform: "translate(" + M.l + " " + M.t + ")" }, svg2);
  var KV0 = 30, KV1 = 150;
  function sx2(kv) { return (kv - KV0) / (KV1 - KV0) * pw; }
  H.svg("line", { x1: 0, y1: ph2, x2: pw, y2: ph2, stroke: "currentColor", opacity: 0.5 }, g2);
  [30, 60, 90, 120, 150].forEach(function (v) {
    H.svg("line", { x1: sx2(v), y1: 0, x2: sx2(v), y2: ph2, stroke: "currentColor", opacity: 0.08 }, g2);
    var t = H.svg("text", { x: sx2(v), y: ph2 + 16, "text-anchor": "middle", "font-size": 12 }, g2); t.textContent = v;
  });
  var yl2 = H.svg("text", { x: 0, y: -10, "font-size": 12, opacity: 0.8 }, g2); yl2.textContent = L("對比 C（%）", "Contrast C (%)");
  var xl2 = H.svg("text", { x: pw, y: ph2 + 34, "text-anchor": "end", "font-size": 12, opacity: 0.8 }, g2); xl2.textContent = L("管電壓（kV）", "Tube voltage (kV)");
  var yTicks = H.svg("g", {}, g2);
  var cLine = H.svg("path", { fill: "none", stroke: "var(--field)", "stroke-width": 2 }, g2);
  var cDot = H.svg("circle", { r: 6, fill: "var(--field)", stroke: "var(--paper-2)", "stroke-width": 2 }, g2);
  var cLbl = H.svg("text", { "font-size": 12, "font-weight": 600 }, g2);

  var readout = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:10px 0 0;line-height:1.7" }, wrap);

  // 先算好整條對比曲線（只跟過濾厚度有關）
  var curveCache = {};
  function curve(al) {
    if (curveCache[al]) return curveCache[al];
    var arr = [];
    for (var kv = KV0; kv <= KV1; kv += 2) arr.push([kv, contrastAt(kv, al).C]);
    return (curveCache[al] = arr);
  }

  var lastPts = [], lastMax = 1, refCache = {};
  function refMax(al) {
    if (!refCache[al]) refCache[al] = spectrum(150, al).reduce(function (m, p) { return Math.max(m, p[1]); }, 0);
    return refCache[al];
  }
  function render() {
    var pts = spectrum(state.kv, state.al);
    var max = 0; pts.forEach(function (p) { if (p[1] > max) max = p[1]; });
    // 縱軸固定用「同樣過濾、150 kV」時的最大值，讓不同電壓之間可以直接比較
    var ref = refMax(state.al);
    var sy = function (v) { return ph - v / ref * ph * 0.92; };
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1); }).join(" ");
    line.setAttribute("d", d);
    area.setAttribute("d", d + " L" + sx(state.kv) + " " + ph + " L" + sx(5) + " " + ph + " Z");
    lastPts = pts; lastMax = max;

    emaxMark.innerHTML = "";
    var x = sx(state.kv);
    H.svg("line", { x1: x, y1: ph, x2: x, y2: ph - 18, stroke: "currentColor", "stroke-width": 1.5 }, emaxMark);
    var t = H.svg("text", { x: x, y: ph - 22, "text-anchor": x > pw - 70 ? "end" : "middle", "font-size": 11 }, emaxMark);
    t.textContent = "E₀ = " + state.kv + " keV";

    kmark.innerHTML = "";
    if (state.kv > 69.5) {
      var peak = pts.reduce(function (m, p) { return Math.abs(p[0] - 59.3) < 0.3 ? p[1] : m; }, 0);
      var tk = H.svg("text", { x: sx(59.3) - 6, y: Math.max(12, sy(peak) + 4), "text-anchor": "end", "font-size": 11 }, kmark);
      tk.textContent = L("鎢 Kα、Kβ 特性譜線", "W Kα, Kβ lines");
    }

    // 圖 2
    var cv = curve(state.al);
    var cmax = 0; cv.forEach(function (p) { if (p[1] > cmax) cmax = p[1]; });
    cmax = Math.ceil(cmax * 10) / 10 + 0.05;
    var sy2 = function (v) { return ph2 - v / cmax * ph2; };
    cLine.setAttribute("d", cv.map(function (p, i) { return (i ? "L" : "M") + sx2(p[0]).toFixed(1) + " " + sy2(p[1]).toFixed(1); }).join(" "));
    yTicks.innerHTML = "";
    for (var v = 0; v <= cmax + 1e-9; v += 0.2) {
      H.svg("line", { x1: 0, y1: sy2(v), x2: pw, y2: sy2(v), stroke: "currentColor", opacity: 0.08 }, yTicks);
      var tt = H.svg("text", { x: -8, y: sy2(v) + 4, "text-anchor": "end", "font-size": 12 }, yTicks);
      tt.textContent = Math.round(v * 100);
    }
    var c = contrastAt(state.kv, state.al);
    cDot.setAttribute("cx", sx2(state.kv)); cDot.setAttribute("cy", sy2(c.C));
    cLbl.setAttribute("x", sx2(state.kv) + (state.kv > 120 ? -10 : 10));
    cLbl.setAttribute("text-anchor", state.kv > 120 ? "end" : "start");
    cLbl.setAttribute("y", sy2(c.C) - 10);
    cLbl.textContent = "C = " + (c.C * 100).toFixed(1) + "%";

    var lam = 1.2398 / state.kv;
    var eff = 1.1e-9 * 74 * state.kv * 1000 * 100;
    var mean = 0, sum = 0; pts.forEach(function (p) { mean += p[0] * p[1]; sum += p[1]; }); mean /= sum;
    readout.innerHTML =
      L("最短波長 λ<sub>min</sub> = hc / eV = ", "Shortest wavelength λ<sub>min</sub> = hc / eV = ") + (lam * 1000).toFixed(1) + " pm" +
      L("　強度加權平均能量 ≈ ", "　intensity-weighted mean energy ≈ ") + mean.toFixed(1) + " keV<br>" +
      L("穿透 10 cm 軟組織：", "Through 10 cm tissue: ") + (c.tissue / c.total * 100).toFixed(2) + "%　" +
      L("其中 1 cm 換成骨頭：", "With 1 cm bone: ") + (c.bone / c.total * 100).toFixed(2) + "%<br>" +
      L("X 光管效率 η ≈ 1.1×10⁻⁹ · Z · V ≈ ", "Tube efficiency η ≈ 1.1×10⁻⁹ · Z · V ≈ ") + eff.toFixed(2) + "%" +
      L("（其餘 99% 以上變成熱）", " (the rest becomes heat)");
  }

  // 圖 1 的游標提示
  function onMove(ev) {
    var pt = svg1.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    var m = g1.getScreenCTM(); if (!m) return;
    var p = pt.matrixTransform(m.inverse());
    var E = Math.max(5, Math.min(state.kv, p.x / pw * EMAX));
    var nearest = lastPts.reduce(function (a, b) { return Math.abs(b[0] - E) < Math.abs(a[0] - E) ? b : a; }, lastPts[0]);
    if (!nearest) return;
    var y = ph - nearest[1] / refMax(state.al) * ph * 0.92;
    hover1.setAttribute("opacity", 1);
    hLine.setAttribute("x1", sx(nearest[0])); hLine.setAttribute("x2", sx(nearest[0]));
    hDot.setAttribute("cx", sx(nearest[0])); hDot.setAttribute("cy", y);
    var right = sx(nearest[0]) > pw - 140;
    hTxt.setAttribute("x", sx(nearest[0]) + (right ? -8 : 8));
    hTxt.setAttribute("text-anchor", right ? "end" : "start");
    hTxt.textContent = nearest[0].toFixed(1) + " keV · " + (nearest[1] / lastMax * 100).toFixed(0) + "%";
  }
  hit1.addEventListener("pointermove", onMove);
  hit1.addEventListener("pointerleave", function () { hover1.setAttribute("opacity", 0); });
  render();
});
