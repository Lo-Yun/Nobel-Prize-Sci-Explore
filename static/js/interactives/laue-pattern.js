/* 互動元件：晶體與繞射圖樣（1914 勞厄）
 * 左邊是原子排列（二維晶格），右邊是 X 光穿過後在底片上留下的繞射點。
 * 繞射點的位置就是「倒晶格」：原子排得越密，點散得越開；晶體轉，點也跟著轉。
 *   L1：只調整間距和旋轉
 *   L2：加上晶格種類（正方、長方、六角）
 *   L3：加上兩種原子（像 NaCl），觀察結構因子造成的「消失的點」，並標出 (h, k) */
NobelIX.register("laue-pattern", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var INK = "#3a2e2a";
  var state = { a: 1, rot: 15, lattice: "square", basis: false, f2: 1 };

  var wrap = H.el("div", { class: "lp" }, stage);
  var row = H.el("div", { style: "display:flex;flex-wrap:wrap;gap:12px;justify-content:center" }, wrap);
  function panel(title) {
    var box = H.el("div", { style: "flex:1 1 240px;min-width:0;max-width:320px" }, row);
    H.el("p", { text: title, style: "margin:0 0 4px;font-weight:700;text-align:center" }, box);
    return box;
  }
  var p1 = panel(L("晶體裡的原子排列", "Atoms in the crystal"));
  var p2 = panel(L("底片上的繞射點", "Spots on the film"));
  var S = 260, C = S / 2;
  var svgA = H.svg("svg", { viewBox: "0 0 " + S + " " + (S + 22), class: "ix-svg", role: "img", "aria-label": L("原子排列圖", "Lattice") }, p1);
  var svgB = H.svg("svg", { viewBox: "0 0 " + S + " " + (S + 22), class: "ix-svg", role: "img", "aria-label": L("繞射圖樣", "Diffraction pattern") }, p2);
  H.sketchDefs(svgA, id + "a");
  var defsB = H.sketchDefs(svgB, id + "b");
  var glow = H.svg("filter", { id: id + "-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defsB);
  glow.innerHTML = '<feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>';
  H.svg("circle", { cx: C, cy: C, r: C - 4, fill: "#f4f8fb", stroke: INK, "stroke-width": 2.4, filter: "url(#" + id + "a-rough)" }, svgA);
  H.svg("circle", { cx: C, cy: C, r: C - 4, fill: "#101826", stroke: INK, "stroke-width": 2.4, filter: "url(#" + id + "b-rough)" }, svgB);
  var gA = H.svg("g", {}, svgA), gB = H.svg("g", {}, svgB);
  var tip = H.svg("text", { x: C, y: S + 16, "text-anchor": "middle", "font-size": 12 }, svgB);

  // 控制
  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  function slider(label, key, min, max, step, fmt) {
    var lab = H.el("label", {}, ctr);
    H.el("span", { text: label }, lab);
    var inp = H.el("input", { type: "range", min: min, max: max, step: step, value: state[key], id: id + "-" + key }, lab);
    var out = H.el("span", { class: "ix-readout" }, lab);
    function sync() { out.textContent = fmt(state[key]); }
    inp.addEventListener("input", function () { state[key] = +inp.value; sync(); render(); });
    sync();
  }
  slider(L("原子間距", "Spacing"), "a", 0.6, 1.6, 0.05, function (v) { return level === "L1" ? (v < 0.9 ? L("很密", "tight") : v > 1.25 ? L("很鬆", "loose") : L("中等", "medium")) : "×" + v.toFixed(2); });
  slider(L("轉動晶體", "Rotate"), "rot", 0, 90, 1, function (v) { return v + "°"; });

  if (level !== "L1") {
    var c2 = H.el("div", { class: "ix-controls", role: "group", "aria-label": L("晶格種類", "Lattice type") }, wrap);
    H.el("span", { text: L("排列方式：", "Lattice: ") }, c2);
    var types = [["square", L("正方形", "Square")], ["rect", L("長方形", "Rectangular")], ["hex", L("六角形", "Hexagonal")]];
    var tBtns = types.map(function (t) {
      var b = H.el("button", { type: "button", class: "ix-btn", text: t[1] }, c2);
      b.addEventListener("click", function () { state.lattice = t[0]; if (t[0] !== "square") state.basis = false; render(); });
      return [t[0], b];
    });
  }
  if (level === "L3") {
    var c3 = H.el("div", { class: "ix-controls" }, wrap);
    var bb = H.el("button", { type: "button", class: "ix-btn", text: L("加入第二種原子（像 NaCl）", "Add a second atom (like NaCl)") }, c3);
    bb.addEventListener("click", function () { state.basis = !state.basis; if (state.basis) state.lattice = "square"; render(); });
    var lab = H.el("label", {}, c3);
    H.el("span", { text: L("第二種原子的散射強度 f₂/f₁", "Scattering ratio f₂/f₁") }, lab);
    var inp = H.el("input", { type: "range", min: 0.1, max: 1, step: 0.05, value: state.f2, id: id + "-f2" }, lab);
    var out = H.el("span", { class: "ix-readout", text: "1.00" }, lab);
    inp.addEventListener("input", function () { state.f2 = +inp.value; out.textContent = state.f2.toFixed(2); render(); });
  }
  var note = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0" }, wrap);

  function vectors() {
    // 實空間晶格向量（單位：任意長度）
    if (state.lattice === "rect") return [[1, 0], [0, 1.5]];
    if (state.lattice === "hex") return [[1, 0], [0.5, Math.sqrt(3) / 2]];
    return [[1, 0], [0, 1]];
  }
  function rotate(v, deg) {
    var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  }
  function render() {
    var v = vectors();
    var a1 = rotate(v[0], state.rot), a2 = rotate(v[1], state.rot);
    var scale = 26 * state.a; // 實空間：一個單位 = 26px × 間距
    // 倒晶格：b_i · a_j = δ_ij
    var det = a1[0] * a2[1] - a1[1] * a2[0];
    var b1 = [a2[1] / det, -a2[0] / det], b2 = [-a1[1] / det, a1[0] / det];
    var kScale = 34 / state.a; // 繞射圖：一個倒晶格單位 = 34px ÷ 間距

    // 左：原子
    gA.innerHTML = "";
    var R = C - 12;
    for (var i = -12; i <= 12; i++) for (var j = -12; j <= 12; j++) {
      var x = C + (i * a1[0] + j * a2[0]) * scale, y = C - (i * a1[1] + j * a2[1]) * scale;
      if (Math.hypot(x - C, y - C) > R) continue;
      H.svg("circle", { cx: x, cy: y, r: 5.5, fill: "#6cbf84", stroke: INK, "stroke-width": 1.2 }, gA);
      if (state.basis) {
        var hx = x + (a1[0] + a2[0]) / 2 * scale, hy = y - (a1[1] + a2[1]) / 2 * scale;
        if (Math.hypot(hx - C, hy - C) <= R)
          H.svg("circle", { cx: hx, cy: hy, r: 2.5 + 3 * state.f2, fill: "#a77fd6", stroke: INK, "stroke-width": 1 }, gA);
      }
    }
    // 晶格向量箭頭
    if (level !== "L1") {
      [[a1, "a₁"], [a2, "a₂"]].forEach(function (p) {
        var x2 = C + p[0][0] * scale, y2 = C - p[0][1] * scale;
        H.svg("line", { x1: C, y1: C, x2: x2, y2: y2, stroke: "#d9534f", "stroke-width": 2.5, "stroke-linecap": "round" }, gA);
        var t = H.svg("text", { x: x2 + 4, y: y2 - 4, "font-size": 12, style: "fill:#b8424f;font-weight:700" }, gA); t.textContent = p[1];
      });
    }

    // 右：繞射點
    gB.innerHTML = "";
    var count = 0, missing = 0;
    for (var h = -10; h <= 10; h++) for (var k = -10; k <= 10; k++) {
      var gx = h * b1[0] + k * b2[0], gy = h * b1[1] + k * b2[1];
      var px = C + gx * kScale, py = C - gy * kScale;
      var rr = Math.hypot(px - C, py - C);
      if (rr > R) continue;
      var g2 = gx * gx + gy * gy;
      var F = 1;
      if (state.basis) F = (1 + state.f2 * Math.pow(-1, h + k)) / (1 + state.f2);
      var I = F * F * Math.exp(-g2 * 0.18);
      if (h === 0 && k === 0) {
        H.svg("circle", { cx: C, cy: C, r: 9, fill: "#fffbe6", filter: "url(#" + id + "-glow)" }, gB);
        continue;
      }
      if (I < 0.01) { missing++; if (level === "L3") H.svg("circle", { cx: px, cy: py, r: 3, fill: "none", stroke: "#8899aa", "stroke-dasharray": "2 2" }, gB); continue; }
      count++;
      var dot = H.svg("circle", { cx: px, cy: py, r: 1.5 + 4.5 * Math.sqrt(I), fill: "#d7f0ff", opacity: 0.35 + 0.65 * Math.sqrt(I), filter: "url(#" + id + "-glow)" }, gB);
      if (level === "L3") {
        var tt = H.svg("title", {}, dot); tt.textContent = "(h, k) = (" + h + ", " + k + ")";
      }
    }
    tip.textContent = L("中央亮點：直接穿過的 X 光", "Centre: the direct beam");

    if (tBtns) tBtns.forEach(function (t) { t[1].setAttribute("aria-pressed", String(t[0] === state.lattice)); });
    if (bb) bb.setAttribute("aria-pressed", String(state.basis));

    var msg;
    if (level === "L1") {
      msg = state.a < 0.9
        ? L("原子擠得很密，光點反而散得很開！", "Atoms packed tight → spots spread far apart!")
        : state.a > 1.25
          ? L("原子排得比較鬆，光點就靠得比較近。", "Atoms far apart → spots close together.")
          : L("轉動晶體，光點也會跟著一起轉。", "Turn the crystal and the spots turn with it.");
    } else {
      msg = L("繞射點間距 ∝ 1 / 原子間距。點的圖案和晶體有一樣的對稱性。", "Spot spacing ∝ 1 / atomic spacing. The pattern shares the crystal's symmetry.");
      if (state.basis) msg = L("h + k 為奇數的點，兩種原子散射的波相位相反而互相抵消。f₂ = f₁ 時這些點完全消失（虛線圈）。目前看得到 ", "Spots with h + k odd: the two atoms scatter out of phase. They vanish when f₂ = f₁. Visible: ") + count + L(" 個點，消失 ", ", missing ") + missing + L(" 個。", ".");
    }
    note.textContent = msg;
  }
  render();
});
