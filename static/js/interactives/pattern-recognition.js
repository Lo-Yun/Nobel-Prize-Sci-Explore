/* 互動元件：先天免疫的警報器（2011 博伊特勒、霍夫曼、史坦曼）
 * 哨兵細胞表面（和內部的小泡泡裡）有幾種「類鐸受體」（TLR），各自認得一種微生物才有的圖案：
 *   TLR4 ↔ 革蘭氏陰性菌外膜的脂多醣（LPS）；TLR5 ↔ 鞭毛蛋白；TLR3 ↔ 病毒的雙股 RNA
 * 認出來就拉警報（發炎細胞激素、干擾素）；L2 以上，樹突細胞再把情報帶到淋巴結，啟動 T 細胞（後天免疫）。
 * 可以把某個受體「關掉」，重現博伊特勒研究的 TLR4 突變小鼠：對 LPS 毫無反應。
 * L3 加上訊號傳遞路徑：MyD88 與 TRIF 兩條路，可以分別關掉。 */
NobelIX.register("pattern-recognition", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var INK = "#3a2e2a";
  var INVADERS = [
    { key: "gneg", name: L("革蘭氏陰性菌（外膜有 LPS）", "Gram-negative bacterium (LPS)"), patterns: ["LPS"], color: "#4f9a3a" },
    { key: "flag", name: L("有鞭毛的細菌（沒有 LPS）", "Flagellated bacterium (no LPS)"), patterns: ["FLA"], color: "#7aa83a" },
    { key: "virus", name: L("RNA 病毒（雙股 RNA）", "RNA virus (dsRNA)"), patterns: ["RNA"], color: "#8a5cc4" },
    { key: "self", name: L("身體自己的細胞", "One of our own cells"), patterns: [], color: "#e9c4a8" }
  ];
  var REC = { TLR4: "LPS", TLR5: "FLA", TLR3: "RNA" };
  var ADAPTOR = { TLR4: ["MyD88", "TRIF"], TLR5: ["MyD88"], TLR3: ["TRIF"] };
  var state = { on: { TLR4: true, TLR5: true, TLR3: true, MyD88: true, TRIF: true }, inv: null, t: 0, result: null };

  var wrap = H.el("div", {}, stage);
  var svg = H.svg("svg", { viewBox: "0 0 600 " + (level === "L3" ? 420 : 300), class: "ix-svg", role: "img", "aria-label": L("哨兵細胞與入侵者", "Sentinel cell and invader") }, wrap);
  H.sketchDefs(svg, id);
  var g = H.svg("g", {}, svg);

  var c1 = H.el("div", { class: "ix-controls", role: "group", "aria-label": L("派入侵者", "Send an invader") }, wrap);
  H.el("span", { text: L("派誰進來：", "Send in: ") }, c1);
  INVADERS.forEach(function (v) {
    var b = H.el("button", { type: "button", class: "ix-btn", text: v.name }, c1);
    b.addEventListener("click", function () { state.inv = v; state.t = 0; state.result = null; });
  });
  var c2 = H.el("div", { class: "ix-controls", role: "group", "aria-label": L("開關受體", "Toggle receptors") }, wrap);
  H.el("span", { text: level === "L1" ? L("警報器開關：", "Alarms: ") : L("受體開關（關掉＝突變）：", "Receptors (off = mutant): ") }, c2);
  var keys = ["TLR4", "TLR5", "TLR3"].concat(level === "L3" ? ["MyD88", "TRIF"] : []);
  var tBtns = {};
  keys.forEach(function (k) {
    var b = H.el("button", { type: "button", class: "ix-btn", text: k }, c2);
    b.addEventListener("click", function () { state.on[k] = !state.on[k]; state.t = 0; state.result = null; });
    tBtns[k] = b;
  });
  var msg = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0;line-height:1.7" }, wrap);

  function evaluate(inv) {
    var hits = [], ad = { MyD88: false, TRIF: false };
    ["TLR4", "TLR5", "TLR3"].forEach(function (r) {
      if (state.on[r] && inv.patterns.indexOf(REC[r]) >= 0) { hits.push(r); ADAPTOR[r].forEach(function (a) { if (state.on[a]) ad[a] = true; }); }
    });
    return { hits: hits, nfkb: ad.MyD88 || ad.TRIF, irf3: ad.TRIF, alarm: ad.MyD88 || ad.TRIF };
  }

  var CX = 170, CY = 150, R = 95;
  function patternIcon(p, x, y, s) {
    if (p === "LPS") return H.svg("path", { d: "M" + (x - 5 * s) + " " + (y + 4 * s) + " l" + 5 * s + " " + (-9 * s) + " l" + 5 * s + " " + 9 * s + " Z", fill: "#d4a017", stroke: INK, "stroke-width": 1 }, g);
    if (p === "FLA") return H.svg("path", { d: "M" + (x - 8 * s) + " " + y + " q" + 4 * s + " " + (-6 * s) + " " + 8 * s + " 0 t" + 8 * s + " 0", fill: "none", stroke: "#3d6fb6", "stroke-width": 2.5 }, g);
    return H.svg("path", { d: "M" + (x - 7 * s) + " " + (y - 5 * s) + " C" + x + " " + (y + 5 * s) + " " + x + " " + (y + 5 * s) + " " + (x + 7 * s) + " " + (y - 5 * s) + " M" + (x - 7 * s) + " " + (y + 5 * s) + " C" + x + " " + (y - 5 * s) + " " + x + " " + (y - 5 * s) + " " + (x + 7 * s) + " " + (y + 5 * s), fill: "none", stroke: "#c2417a", "stroke-width": 2 }, g);
  }
  var RECPOS = { TLR4: [CX + R * Math.cos(-0.6), CY + R * Math.sin(-0.6), -0.6], TLR5: [CX + R * Math.cos(0.15), CY + R * Math.sin(0.15), 0.15], TLR3: [CX + 40, CY + 45, null] };

  function draw() {
    g.innerHTML = "";
    var inv = state.inv, t = state.t, ev = inv ? evaluate(inv) : null;
    var arrived = inv && t >= 70, alarm = arrived && ev.alarm;
    // 哨兵細胞
    H.svg("circle", { cx: CX, cy: CY, r: R, fill: alarm ? "#f7c9c0" : "#f6efe4", filter: "url(#" + id + "-pencil)" }, g);
    H.svg("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: INK, "stroke-width": 2.4, filter: "url(#" + id + "-rough)" }, g);
    var nm = H.svg("text", { x: CX - 30, y: CY - 20, "text-anchor": "middle", "font-size": 12 }, g); nm.textContent = L("哨兵細胞", "Sentinel cell");
    H.svg("circle", { cx: CX + 40, cy: CY + 45, r: 26, fill: "#efe3f6", stroke: INK, "stroke-width": 1.2, "stroke-dasharray": "3 2" }, g);
    var en = H.svg("text", { x: CX + 40, y: CY + 82, "text-anchor": "middle", "font-size": 10 }, g); en.textContent = L("胞內體", "endosome");
    // 受體
    Object.keys(RECPOS).forEach(function (r) {
      var p = RECPOS[r], on = state.on[r], col = on ? "#2e8b57" : "#9a958c";
      if (p[2] !== null) {
        var ox = Math.cos(p[2]) * 22, oy = Math.sin(p[2]) * 22;
        H.svg("line", { x1: p[0], y1: p[1], x2: p[0] + ox, y2: p[1] + oy, stroke: col, "stroke-width": 4, "stroke-linecap": "round" }, g);
        H.svg("circle", { cx: p[0] + ox, cy: p[1] + oy, r: 9, fill: on ? "#d9f0dc" : "#e6e3dd", stroke: col, "stroke-width": 2 }, g);
        patternIcon(REC[r], p[0] + ox, p[1] + oy, 0.7);
        var lt = H.svg("text", { x: p[0] + ox + 14, y: p[1] + oy + 4, "font-size": 11, style: "font-weight:700" }, g); lt.textContent = r + (on ? "" : " ✕");
      } else {
        H.svg("circle", { cx: p[0], cy: p[1], r: 9, fill: on ? "#d9f0dc" : "#e6e3dd", stroke: col, "stroke-width": 2 }, g);
        patternIcon("RNA", p[0], p[1], 0.7);
        var lt2 = H.svg("text", { x: p[0], y: p[1] - 14, "text-anchor": "middle", "font-size": 11, style: "font-weight:700" }, g); lt2.textContent = r + (on ? "" : " ✕");
      }
    });
    // 入侵者
    if (inv) {
      var x = Math.max(CX + R + 50, 560 - t * 4), y = CY;
      var cleared = alarm && t > 140 && inv.key !== "self";
      var grow = inv.key !== "self" && arrived && !ev.alarm ? Math.min(5, 1 + Math.floor((t - 70) / 30)) : 1;
      for (var k = 0; k < grow; k++) {
        var ix = x + (k % 3) * 34, iy = y - 40 + Math.floor(k / 3) * 50 + (k ? 40 : 40);
        if (k === 0) iy = y;
        var op = cleared ? Math.max(0, 1 - (t - 140) / 60) : 1;
        var gi = H.svg("g", { opacity: op }, g);
        if (inv.key === "virus") {
          H.svg("polygon", { points: [0, 1, 2, 3, 4, 5].map(function (j) { var a = j * Math.PI / 3; return (ix + 16 * Math.cos(a)) + "," + (iy + 16 * Math.sin(a)); }).join(" "), fill: inv.color, stroke: INK, "stroke-width": 1.5 }, gi);
        } else if (inv.key === "self") {
          H.svg("circle", { cx: ix, cy: iy, r: 20, fill: inv.color, stroke: INK, "stroke-width": 1.5 }, gi);
          H.svg("circle", { cx: ix, cy: iy, r: 7, fill: "#c9a0d8" }, gi);
        } else {
          H.svg("ellipse", { cx: ix, cy: iy, rx: 22, ry: 12, fill: inv.color, stroke: INK, "stroke-width": 1.5 }, gi);
          if (inv.key === "flag") H.svg("path", { d: "M" + (ix + 22) + " " + iy + " q6 -8 12 0 t12 0 t12 0", fill: "none", stroke: "#3d6fb6", "stroke-width": 2.2 }, gi);
        }
        if (k === 0) inv.patterns.forEach(function (p, j) { patternIcon(p, ix - 6 + j * 12, iy - 20, 0.8); });
      }
      if (!cleared || t < 170) { var il = H.svg("text", { x: Math.max(400, Math.min(530, x)), y: y + 52, "text-anchor": "middle", "font-size": 11 }, g); il.textContent = inv.name; }
    }
    // 警報：細胞激素
    if (alarm) {
      for (var j = 0; j < 14; j++) {
        var a = j / 14 * Math.PI * 2, r = R + 10 + ((t - 70) * 1.2 + j * 7) % 60;
        H.svg("circle", { cx: CX + r * Math.cos(a), cy: CY + r * Math.sin(a), r: 3, fill: ev.irf3 && j % 2 ? "#3d6fb6" : "#e0663a", opacity: 0.8 }, g);
      }
    }
    // 淋巴結（L2 以上）
    if (level !== "L1") {
      H.svg("rect", { x: 420, y: 205, width: 170, height: 85, rx: 30, fill: "#eef2fb", stroke: INK, "stroke-width": 1.5 }, g);
      var ln = H.svg("text", { x: 505, y: 222, "text-anchor": "middle", "font-size": 11 }, g); ln.textContent = L("淋巴結", "Lymph node");
      var tcellOn = alarm && t > 200 && inv.key !== "self";
      for (var q = 0; q < 4; q++) H.svg("circle", { cx: 450 + q * 36, cy: 255, r: 11, fill: tcellOn ? "#7aa8d6" : "#cfd8e6", stroke: INK, "stroke-width": 1 }, g);
      if (alarm && inv.key !== "self" && t > 100) {
        var f = Math.min(1, (t - 100) / 100), dx = CX + 60 + f * (450 - CX - 60), dy = CY + 70 + f * (255 - CY - 70);
        var star = [0, 1, 2, 3, 4, 5, 6, 7].map(function (j) { var rr = j % 2 ? 6 : 14, aa = j * Math.PI / 4; return (dx + rr * Math.cos(aa)) + "," + (dy + rr * Math.sin(aa)); }).join(" ");
        H.svg("polygon", { points: star, fill: "#f6c3a8", stroke: INK, "stroke-width": 1.2 }, g);
        if (f < 1) { var dl = H.svg("text", { x: dx, y: dy - 18, "text-anchor": "middle", "font-size": 10 }, g); dl.textContent = L("樹突細胞帶著情報", "dendritic cell"); }
      }
      if (tcellOn) { var tl = H.svg("text", { x: 505, y: 284, "text-anchor": "middle", "font-size": 11, style: "font-weight:700" }, g); tl.textContent = L("T 細胞被啟動了！", "T cells activated!"); }
    }
    // 訊號路徑（L3）
    if (level === "L3") {
      var y0 = 320;
      var nodes = { TLR4: [60, y0], TLR5: [60, y0 + 30], TLR3: [60, y0 + 60], MyD88: [200, y0 + 10], TRIF: [200, y0 + 55], "NF-κB": [340, y0 + 10], IRF3: [340, y0 + 55] };
      var outs = { "NF-κB": L("發炎細胞激素 TNF、IL-1、IL-6", "TNF, IL-1, IL-6"), IRF3: L("第一型干擾素", "Type I interferon") };
      var active = {};
      if (ev && arrived) {
        ev.hits.forEach(function (r) { active[r] = true; ADAPTOR[r].forEach(function (a) { if (state.on[a]) active[a] = true; }); });
        if (active.MyD88 || active.TRIF) active["NF-κB"] = true;
        if (active.TRIF) active.IRF3 = true;
      }
      var edges = [["TLR4", "MyD88"], ["TLR4", "TRIF"], ["TLR5", "MyD88"], ["TLR3", "TRIF"], ["MyD88", "NF-κB"], ["TRIF", "NF-κB"], ["TRIF", "IRF3"]];
      edges.forEach(function (e) {
        var a = nodes[e[0]], b = nodes[e[1]], on2 = active[e[0]] && active[e[1]];
        H.svg("line", { x1: a[0] + 40, y1: a[1], x2: b[0] - 40, y2: b[1], stroke: on2 ? "#e0663a" : "currentColor", "stroke-width": on2 ? 3 : 1, opacity: on2 ? 1 : 0.3 }, g);
      });
      Object.keys(nodes).forEach(function (k2) {
        var p = nodes[k2], off = state.on[k2] === false;
        H.svg("rect", { x: p[0] - 40, y: p[1] - 11, width: 80, height: 22, rx: 6, fill: active[k2] ? "#ffe58a" : "var(--paper)", stroke: off ? "#c0392b" : "currentColor", "stroke-width": 1.2, "stroke-dasharray": off ? "4 3" : null }, g);
        var tx = H.svg("text", { x: p[0], y: p[1] + 4, "text-anchor": "middle", "font-size": 11 }, g); tx.textContent = k2 + (off ? " ✕" : "");
      });
      Object.keys(outs).forEach(function (k3) {
        var p = nodes[k3];
        var tx = H.svg("text", { x: p[0] + 50, y: p[1] + 4, "font-size": 11, style: active[k3] ? "font-weight:700" : "opacity:.5" }, g); tx.textContent = "→ " + outs[k3];
      });
    }
    Object.keys(tBtns).forEach(function (k) { tBtns[k].setAttribute("aria-pressed", String(!state.on[k])); });

    var text;
    if (!inv) text = L("選一種入侵者派進來，看看哨兵細胞會不會拉警報。也可以先關掉某個警報器（受體）再試試。", "Send an invader in and see whether the sentinel sounds the alarm. Try switching receptors off first.");
    else if (!arrived) text = L("入侵者靠近中……", "The invader approaches…");
    else if (inv.key === "self") text = L("✓ 沒有拉警報：自己的細胞身上沒有微生物的圖案，免疫系統不會攻擊它。", "✓ No alarm: our own cells carry no microbial patterns.");
    else if (!ev.hits.length) text = L("⚠ 沒有任何受體認出它！入侵者開始大量繁殖。", "⚠ No receptor recognized it! The invader multiplies.") +
      (inv.key === "gneg" && !state.on.TLR4 ? L("（博伊特勒發現，TLR4 突變的小鼠對 LPS 完全沒有反應，正是這個情況。）", " (Beutler found TLR4-mutant mice ignore LPS — exactly this.)") : "");
    else if (!ev.alarm) text = L("受體認出了圖案，但傳遞訊號的蛋白質被關掉了，警報響不起來。", "The receptor saw the pattern, but the signalling adaptor is off.");
    else text = L("🚨 ", "🚨 ") + ev.hits.join("、") + L(" 認出了入侵者，哨兵細胞放出警報訊號（細胞激素）", " recognized it; the sentinel releases cytokines") +
      (ev.irf3 ? L("和干擾素", " and interferons") : "") + "。" +
      (level !== "L1" ? L("樹突細胞把敵人的碎片帶到淋巴結，啟動 T 細胞，後天免疫接手。", " A dendritic cell carries pieces to the lymph node to activate T cells.") : L("警衛們趕來把入侵者清除了！", " Defenders clear the invader!"));
    msg.textContent = text;
  }
  function loop() { if (state.inv && state.t < 320) state.t++; draw(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
});
