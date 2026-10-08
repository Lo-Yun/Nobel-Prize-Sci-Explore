/* 互動元件：電腦斷層的影像重建（1979 柯馬克、杭斯菲爾德）
 * 1. 一個簡化的「胸部切面」假體（真實答案，電腦看不到）
 * 2. 從各個角度拍 X 光，得到投影；把所有投影疊起來就是「正弦圖」
 * 3. 反投影：把每個投影沿原方向「抹回去」。不加濾波會很模糊；
 *    先用斜坡濾波器（Ram-Lak）處理，就能得到清楚的影像（濾波反投影 FBP）。
 *   L2：角度數量、濾波開關、逐步播放
 *   L3：另外顯示正弦圖座標與重建誤差 */
NobelIX.register("ct-reconstruct", function (stage, H, id) {
  var L = function (zh, en) { return H.t({ "zh-TW": zh, en: en }); };
  var level = stage.dataset.mode || stage.dataset.level || "L2";
  var N = 96;              // 影像解析度 N×N
  var NA_MAX = 180;        // 最多角度數（0°～179°）
  var state = { angles: 12, filter: level === "L3", playing: false };

  // ---------- 假體：橢圓組合，數值代表衰減係數（相對值） ----------
  var ELLIPSES = [ // cx, cy, rx, ry, 數值（相加）
    [0, 0, 0.88, 0.66, 1.0],      // 身體
    [-0.36, -0.02, 0.26, 0.42, -0.75], // 左肺（空氣多，衰減低）
    [0.36, -0.02, 0.26, 0.42, -0.75],  // 右肺
    [0, 0.48, 0.09, 0.09, 1.2],   // 脊椎
    [0.06, -0.12, 0.13, 0.16, 0.25],   // 心臟
    [-0.4, 0.12, 0.05, 0.05, 0.5]      // 小腫瘤
  ];
  var truth = new Float32Array(N * N);
  for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
    var x = (i + 0.5) / N * 2 - 1, y = (j + 0.5) / N * 2 - 1, v = 0;
    ELLIPSES.forEach(function (e) { var dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[3]; if (dx * dx + dy * dy <= 1) v += e[4]; });
    truth[j * N + i] = v;
  }

  // ---------- 投影（像素驅動，線性分配到偵測器格） ----------
  var NB = Math.ceil(N * Math.SQRT2) + 2, MID = (NB - 1) / 2;
  var sino = new Float32Array(NA_MAX * NB);
  var cosT = [], sinT = [];
  for (var a = 0; a < NA_MAX; a++) {
    var t = a * Math.PI / NA_MAX; cosT[a] = Math.cos(t); sinT[a] = Math.sin(t);
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var val = truth[j * N + i]; if (!val) continue;
      var s = (i - N / 2 + 0.5) * cosT[a] + (j - N / 2 + 0.5) * sinT[a] + MID;
      var b0 = Math.floor(s), f = s - b0;
      sino[a * NB + b0] += val * (1 - f); sino[a * NB + b0 + 1] += val * f;
    }
  }
  // Ram-Lak 濾波核：h(0)=1/4，h(奇數 n)=−1/(π²n²)，h(偶數)=0
  var KR = NB;
  var kern = new Float32Array(2 * KR + 1);
  for (var n = -KR; n <= KR; n++) kern[n + KR] = n === 0 ? 0.25 : (n % 2 ? -1 / (Math.PI * Math.PI * n * n) : 0);
  var filtered = new Float32Array(NA_MAX * NB);
  for (a = 0; a < NA_MAX; a++) for (var bb = 0; bb < NB; bb++) {
    var acc = 0;
    for (var m = 0; m < NB; m++) acc += sino[a * NB + m] * kern[bb - m + KR];
    filtered[a * NB + bb] = acc;
  }

  // ---------- 版面 ----------
  var wrap = H.el("div", {}, stage);
  var row = H.el("div", { style: "display:flex;flex-wrap:wrap;gap:12px;justify-content:center" }, wrap);
  function panel(title, w, h) {
    var box = H.el("figure", { style: "margin:0;flex:1 1 170px;min-width:0;max-width:240px;text-align:center" }, row);
    var cv = H.el("canvas", { width: w, height: h, style: "width:100%;height:auto;aspect-ratio:1/1;image-rendering:pixelated;border:2px solid #3a2e2a;border-radius:10px;background:#000" }, box);
    H.el("figcaption", { text: title, style: "font-size:.85em;margin-top:4px" }, box);
    return cv;
  }
  var cvTruth = panel(L("① 真正的切面（電腦看不到）", "① The real slice (hidden)"), N, N);
  var cvSino = panel(L("② 正弦圖：每一列是一個角度的投影", "② Sinogram: one row per angle"), NB, NA_MAX);
  var cvRecon = panel(L("③ 電腦重建出來的影像", "③ The reconstruction"), N, N);

  var ctr = H.el("div", { class: "ix-controls" }, wrap);
  var lab = H.el("label", {}, ctr);
  H.el("span", { text: L("拍攝角度數", "Number of angles") }, lab);
  var inp = H.el("input", { type: "range", min: 1, max: NA_MAX, step: 1, value: state.angles, id: id + "-angles" }, lab);
  var out = H.el("span", { class: "ix-readout" }, lab);
  inp.addEventListener("input", function () { state.angles = +inp.value; stop(); render(); });
  var fBtn = H.el("button", { type: "button", class: "ix-btn", text: L("濾波（讓影像變清楚）", "Filter (sharpen)") }, ctr);
  fBtn.addEventListener("click", function () { state.filter = !state.filter; render(); });
  var pBtn = H.el("button", { type: "button", class: "ix-btn", text: L("▶ 一個角度一個角度加進去", "▶ Add angles one by one") }, ctr);
  pBtn.addEventListener("click", function () { if (state.playing) stop(); else play(); });
  var readout = H.el("p", { class: "ix-readout", "aria-live": "polite", style: "margin:8px 0 0" }, wrap);

  function paint(cv, data, w, h, lo, hi) {
    var ctx = cv.getContext("2d"), img = ctx.createImageData(w, h);
    for (var k = 0; k < w * h; k++) {
      var g = Math.max(0, Math.min(255, (data[k] - lo) / (hi - lo) * 255));
      img.data[4 * k] = img.data[4 * k + 1] = img.data[4 * k + 2] = g; img.data[4 * k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  paint(cvTruth, truth, N, N, 0, 2.2);

  function chosenAngles(count) {
    var list = [];
    for (var q = 0; q < count; q++) list.push(Math.round(q * NA_MAX / count) % NA_MAX);
    return list;
  }
  function reconstruct(list, useFilter) {
    var src = useFilter ? filtered : sino, rec = new Float32Array(N * N);
    list.forEach(function (a) {
      var c = cosT[a], s = sinT[a], base = a * NB;
      for (var jj = 0; jj < N; jj++) {
        var yy = (jj - N / 2 + 0.5) * s + MID;
        for (var ii = 0; ii < N; ii++) {
          var p = (ii - N / 2 + 0.5) * c + yy, b0 = Math.floor(p), fr = p - b0;
          rec[jj * N + ii] += src[base + b0] * (1 - fr) + src[base + b0 + 1] * fr;
        }
      }
    });
    var scale = useFilter ? Math.PI / list.length : 1 / list.length;
    for (var k = 0; k < N * N; k++) rec[k] *= scale;
    return rec;
  }

  function render() {
    out.textContent = state.angles + L(" 個", "");
    inp.value = state.angles;
    fBtn.setAttribute("aria-pressed", String(state.filter));
    var list = chosenAngles(state.angles);
    // 正弦圖：只畫已經拍到的角度
    var shown = new Float32Array(NA_MAX * NB), smax = 0;
    for (var k = 0; k < sino.length; k++) if (sino[k] > smax) smax = sino[k];
    list.forEach(function (a) { for (var bb = 0; bb < NB; bb++) shown[a * NB + bb] = sino[a * NB + bb]; });
    paint(cvSino, shown, NB, NA_MAX, 0, smax);
    var rec = reconstruct(list, state.filter);
    var lo = Infinity, hi = -Infinity;
    if (state.filter) { lo = 0; hi = 2.2; }
    else for (k = 0; k < rec.length; k++) { if (rec[k] < lo) lo = rec[k]; if (rec[k] > hi) hi = rec[k]; }
    paint(cvRecon, rec, N, N, lo, hi);

    var msg = state.filter
      ? L("加上濾波後，模糊的光暈被抵消，肺、脊椎和左肺裡的小腫瘤都清楚了。", "With filtering, the blur cancels out and the lungs, spine and the small tumour appear.")
      : L("只把影子「抹回去」（單純反投影），影像會有一層模糊的光暈。試試看按下「濾波」。", "Plain back-projection leaves a blurry halo. Try the filter.");
    if (state.angles < 8) msg = L("角度太少，只看得到一條條放射狀的線。多拍幾個角度試試！", "Too few angles: only streaks. Add more angles!") + " " + msg;
    if (level === "L3") {
      var err = 0, cnt = 0;
      if (state.filter) { for (k = 0; k < rec.length; k++) { var d = rec[k] - truth[k]; err += d * d; cnt++; } }
      msg += state.filter ? L("　均方根誤差 RMSE ≈ ", "　RMSE ≈ ") + Math.sqrt(err / cnt).toFixed(3) : "";
    }
    readout.textContent = msg;
  }
  var timer = null;
  function play() {
    state.playing = true; pBtn.textContent = L("⏸ 暫停", "⏸ Pause");
    if (state.angles >= NA_MAX) state.angles = 1;
    timer = setInterval(function () {
      state.angles = Math.min(NA_MAX, state.angles + (state.angles < 20 ? 1 : 4));
      render();
      if (state.angles >= NA_MAX) stop();
    }, H.reducedMotion ? 400 : 120);
  }
  function stop() {
    state.playing = false; pBtn.textContent = L("▶ 一個角度一個角度加進去", "▶ Add angles one by one");
    if (timer) clearInterval(timer); timer = null;
  }
  render();
});
