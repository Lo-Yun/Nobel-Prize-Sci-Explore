/* 互動元件：神秘盒子（1979 電腦斷層掃描，L1）
 * 盒子裡藏著東西。從一個方向照 X 光，只看得到一條影子，猜不出位置；
 * 從好幾個方向照，再把影子「交叉」起來，就能找到東西在哪裡。這就是 CT 的想法。 */
NobelIX.register("ct-shadows", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var INK = "#3a2e2a", N = 5;
  var ROUNDS = [
    { hidden: [[3, 1]], views: ["top", "left"] },
    { hidden: [[1, 1], [3, 3]], views: ["top", "left", "diag"] }
  ];
  var round = 0, shown = {}, guesses = {}, opened = false;

  var wrap = H.el("div", {}, stage);
  var title = H.el("p", { style: "margin:0 0 6px;font-weight:700" }, wrap);
  var svg = H.svg("svg", { viewBox: "0 0 420 430", class: "ix-svg", role: "img", "aria-label": L("神秘盒子", "Mystery box") }, wrap);
  H.sketchDefs(svg, id);
  var rough = "url(#" + id + "-rough)", pencil = "url(#" + id + "-pencil)";
  var CELL = 50, OX = 90, OY = 60;
  var g = H.svg("g", {}, svg);
  var bar = H.el("div", { class: "ix-controls" }, wrap);
  var viewBtns = {};
  [["top", L("☀ 從上面照", "☀ Shine from the top")], ["left", L("☀ 從左邊照", "☀ Shine from the left")], ["diag", L("☀ 斜斜地照", "☀ Shine diagonally")]].forEach(function (v) {
    var b = H.el("button", { type: "button", class: "ix-btn", text: v[1] }, bar);
    b.addEventListener("click", function () { shown[v[0]] = !shown[v[0]]; draw(); });
    viewBtns[v[0]] = b;
  });
  var bar2 = H.el("div", { class: "ix-controls" }, wrap);
  var openBtn = H.el("button", { type: "button", class: "ix-btn", text: L("🔓 打開盒子看答案", "🔓 Open the box") }, bar2);
  var nextBtn = H.el("button", { type: "button", class: "ix-btn", text: L("下一關 →", "Next level →") }, bar2);
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0" }, wrap);
  openBtn.addEventListener("click", function () { opened = true; draw(); });
  nextBtn.addEventListener("click", function () { round = (round + 1) % ROUNDS.length; shown = {}; guesses = {}; opened = false; draw(); });

  function has(c, r) { return ROUNDS[round].hidden.some(function (h) { return h[0] === c && h[1] === r; }); }
  function shade(v, max) { return v === 0 ? "#f1ede4" : v >= 2 ? "#2b2d42" : "#6b6f80"; }

  function draw() {
    var R = ROUNDS[round];
    title.textContent = round === 0
      ? L("第 1 關：盒子裡藏了一把鑰匙。用 X 光照照看，再點格子猜它在哪裡！", "Level 1: a key is hidden in the box. Shine X-rays, then tap where you think it is!")
      : L("第 2 關：這次藏了兩把鑰匙！只照兩個方向夠不夠呢？", "Level 2: two keys this time! Are two directions enough?");
    viewBtns.diag.hidden = R.views.indexOf("diag") < 0;
    Object.keys(viewBtns).forEach(function (k) { viewBtns[k].setAttribute("aria-pressed", String(!!shown[k])); });
    g.innerHTML = "";
    // 盒子
    H.svg("rect", { x: OX - 6, y: OY - 6, width: CELL * N + 12, height: CELL * N + 12, rx: 10, fill: "#c99a62", filter: pencil }, g);
    H.svg("rect", { x: OX - 6, y: OY - 6, width: CELL * N + 12, height: CELL * N + 12, rx: 10, fill: "none", stroke: INK, "stroke-width": 2.4, filter: rough }, g);
    for (var c = 0; c < N; c++) for (var r = 0; r < N; r++) {
      var x = OX + c * CELL, y = OY + r * CELL;
      var cell = H.svg("rect", { x: x + 2, y: y + 2, width: CELL - 4, height: CELL - 4, rx: 6, fill: opened ? "#f8f3e6" : "#e3c99c",
        stroke: INK, "stroke-width": 1, opacity: 0.95, tabindex: 0, role: "button",
        "aria-label": L("第 " + (r + 1) + " 列第 " + (c + 1) + " 格", "row " + (r + 1) + ", column " + (c + 1)), style: "cursor:pointer" }, g);
      (function (c, r) {
        function toggle() { if (opened) return; var k = c + "," + r; guesses[k] = !guesses[k]; draw(); }
        cell.addEventListener("click", toggle);
        cell.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
      })(c, r);
      if (guesses[c + "," + r]) {
        var tx = H.svg("text", { x: x + CELL / 2, y: y + CELL / 2 + 8, "text-anchor": "middle", "font-size": 24, "pointer-events": "none" }, g);
        tx.textContent = "📍";
      }
      if (opened && has(c, r)) {
        var tk = H.svg("text", { x: x + CELL / 2, y: y + CELL / 2 + 9, "text-anchor": "middle", "font-size": 26, "pointer-events": "none" }, g);
        tk.textContent = "🔑";
      }
    }
    // 影子（偵測器）
    if (shown.top) {
      H.svg("text", { x: OX + CELL * N / 2, y: 30, "text-anchor": "middle", "font-size": 13 }, g).textContent = L("X 光 ↓↓↓", "X-rays ↓↓↓");
      for (var c2 = 0; c2 < N; c2++) {
        var v = 0; for (var r2 = 0; r2 < N; r2++) if (has(c2, r2)) v++;
        H.svg("rect", { x: OX + c2 * CELL + 2, y: OY + CELL * N + 14, width: CELL - 4, height: 20, rx: 4, fill: shade(v), stroke: INK, "stroke-width": 1 }, g);
      }
      H.svg("text", { x: OX - 10, y: OY + CELL * N + 28, "text-anchor": "end", "font-size": 12 }, g).textContent = L("影子 →", "shadow →");
    }
    if (shown.left) {
      H.svg("text", { x: 14, y: OY + CELL * N / 2 + 5, "font-size": 13 }, g).textContent = L("X 光 →", "X-rays →");
      for (var r3 = 0; r3 < N; r3++) {
        var v2 = 0; for (var c3 = 0; c3 < N; c3++) if (has(c3, r3)) v2++;
        H.svg("rect", { x: OX + CELL * N + 14, y: OY + r3 * CELL + 2, width: 20, height: CELL - 4, rx: 4, fill: shade(v2), stroke: INK, "stroke-width": 1 }, g);
      }
      H.svg("text", { x: OX + CELL * N + 24, y: OY - 12, "font-size": 12, "text-anchor": "middle" }, g).textContent = L("影子", "shadow");
    }
    if (shown.diag) {
      // 沿著「左上 → 右下」方向照：同一條斜線上的格子 c - r 相同
      for (var dgl = -(N - 1); dgl <= N - 1; dgl++) {
        var v3 = 0; for (var c4 = 0; c4 < N; c4++) { var r4 = c4 - dgl; if (r4 >= 0 && r4 < N && has(c4, r4)) v3++; }
        var cx = OX + (dgl >= 0 ? N * CELL : (N + dgl) * CELL), cy = OY + (dgl >= 0 ? (N - dgl) * CELL : N * CELL);
        H.svg("line", { x1: cx, y1: cy, x2: cx + 50, y2: cy + 50, stroke: INK, "stroke-dasharray": "2 4", opacity: 0.4 }, g);
        H.svg("circle", { cx: cx + 54, cy: cy + 54, r: 9, fill: shade(v3), stroke: INK, "stroke-width": 1 }, g);
      }
      H.svg("text", { x: OX - 20, y: OY - 20, "font-size": 13, "text-anchor": "end" }, g).textContent = L("X 光 ↘", "X-rays ↘");
    }
    // 訊息
    var guessKeys = Object.keys(guesses).filter(function (k) { return guesses[k]; });
    if (opened) {
      var right = guessKeys.filter(function (k) { var p = k.split(",").map(Number); return has(p[0], p[1]); }).length;
      var all = right === R.hidden.length && guessKeys.length === R.hidden.length;
      msg.textContent = all
        ? L("全部猜對！你剛剛做的，就是電腦斷層掃描的原理：從很多方向拍，再把影子交叉起來。", "All correct! That is how a CT scan works: many directions, shadows combined.")
        : L("差一點！試試多照幾個方向，看影子在哪裡交叉。", "Close! Try more directions and see where the shadows cross.");
    } else if (!shown.top && !shown.left && !shown.diag) {
      msg.textContent = L("先按上面的按鈕，讓 X 光照過盒子。", "Press a button to shine X-rays through the box.");
    } else if (round === 1 && shown.top && shown.left && !shown.diag) {
      msg.textContent = L("咦？兩個方向的影子交叉出四個可能的位置。再從斜的方向照一次吧！", "Two directions give four possible spots. Try shining diagonally!");
    } else {
      msg.textContent = L("深色的影子代表那一排有東西。把好幾個方向的影子交叉起來，點格子放上 📍。", "Dark shadows mean something is in that line. Combine the directions and place 📍.");
    }
  }
  draw();
});
