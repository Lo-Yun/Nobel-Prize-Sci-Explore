/* 諾貝爾科學探險：共用程式
 * - 學習紀錄（只存在瀏覽器的 localStorage）
 * - 程度選擇
 * - 語音朗讀（瀏覽器內建的 Web Speech API）
 * - 小測驗
 * - 互動元件註冊：NobelIX.register("元件名稱", function (stage, helpers) {...})
 */
(function () {
  "use strict";
  var SITE = window.SITE || { ui: {}, lang: "zh-TW", tts: "zh-TW" };
  var ui = SITE.ui || {};
  var KEY = "nobel-explore:v1";

  function fmt(s, vars) {
    return String(s || "").replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ""; });
  }

  /* ---------------- 學習紀錄 ---------------- */
  var Progress = {
    load: function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    },
    save: function (data) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 私密模式等情況會失敗，忽略 */ }
    },
    update: function (fn) { var d = this.load(); fn(d); this.save(d); return d; },
    entry: function (d, key, level) {
      d.prizes = d.prizes || {};
      d.prizes[key] = d.prizes[key] || {};
      d.prizes[key][level] = d.prizes[key][level] || {};
      return d.prizes[key][level];
    },
    get: function (key, level) {
      var d = this.load();
      return (d.prizes && d.prizes[key] && d.prizes[key][level]) || {};
    }
  };
  window.NobelProgress = Progress;

  /* ---------------- 首頁 ---------------- */
  function initHome() {
    var cards = document.querySelectorAll("[data-pick-level]");
    if (!cards.length) return;
    var data = Progress.load();
    var current = data.level || "L1";

    function applyLevel(level) {
      cards.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.pickLevel === level)); });
      document.querySelectorAll("[data-prize-card]").forEach(function (a) {
        try { var hrefs = JSON.parse(a.dataset.hrefs); if (hrefs[level]) a.href = hrefs[level]; } catch (e) {}
      });
    }
    cards.forEach(function (c) {
      c.addEventListener("click", function () {
        current = c.dataset.pickLevel;
        Progress.update(function (d) { d.level = current; });
        applyLevel(current);
      });
    });
    applyLevel(current);

    var readCount = 0;
    document.querySelectorAll("[data-prize-card]").forEach(function (a) {
      var p = (data.prizes || {})[a.dataset.prizeCard] || {};
      a.querySelectorAll("[data-dot]").forEach(function (dot) {
        if (p[dot.dataset.dot] && p[dot.dataset.dot].done) { dot.classList.add("is-done"); readCount++; }
      });
    });
    var sum = document.getElementById("progress-summary");
    if (sum) sum.textContent = fmt(ui.read_count, { n: readCount });

    var reset = document.getElementById("progress-reset");
    if (reset) {
      var armed = false;
      reset.addEventListener("click", function () {
        if (!armed) { armed = true; reset.textContent = ui.progress_reset_confirm; return; }
        try { localStorage.removeItem(KEY); } catch (e) {}
        reset.textContent = ui.progress_cleared;
        document.querySelectorAll(".dot.is-done").forEach(function (d) { d.classList.remove("is-done"); });
        if (sum) sum.textContent = fmt(ui.read_count, { n: 0 });
        armed = false;
      });
    }
  }

  /* ---------------- 獎項頁 ---------------- */
  function initPrize() {
    var article = document.querySelector("[data-progress-key]");
    if (!article) return;
    var key = article.dataset.progressKey;
    var level = article.dataset.level;
    Progress.update(function (d) { d.level = level; Progress.entry(d, key, level).visited = Date.now(); });

    function refreshTabs() {
      document.querySelectorAll("[data-level-link]").forEach(function (t) {
        t.classList.toggle("is-done", !!Progress.get(key, t.dataset.levelLink).done);
      });
      var btn = document.getElementById("mark-done");
      if (btn && Progress.get(key, level).done) { btn.classList.add("is-done"); btn.textContent = "✓ " + ui.done; }
    }
    var btn = document.getElementById("mark-done");
    if (btn) btn.addEventListener("click", function () {
      Progress.update(function (d) { Progress.entry(d, key, level).done = Date.now(); });
      refreshTabs();
    });
    refreshTabs();
  }

  /* ---------------- 語音朗讀 ---------------- */
  function initTTS() {
    var buttons = document.querySelectorAll("[data-tts-target]");
    if (!buttons.length) return;
    var synth = window.speechSynthesis;
    var speakingBtn = null;

    function pickVoice() {
      if (!synth) return null;
      var voices = synth.getVoices() || [];
      var want = (SITE.tts || "").toLowerCase();
      var base = want.split("-")[0];
      return voices.find(function (v) { return v.lang.toLowerCase().replace("_", "-") === want; }) ||
             voices.find(function (v) { return v.lang.toLowerCase().indexOf(base) === 0; }) || null;
    }
    function textOf(section) {
      var clone = section.querySelector(".prose").cloneNode(true);
      clone.querySelectorAll(".interactive, .quiz, script, .chat__name").forEach(function (n) { n.remove(); });
      var title = section.querySelector("h2").textContent;
      return title + "。" + clone.textContent.replace(/\s+/g, " ").trim();
    }
    function stop() {
      if (synth) synth.cancel();
      if (speakingBtn) {
        speakingBtn.classList.remove("is-speaking");
        speakingBtn.querySelector("span").textContent = ui.read_aloud;
        var s = document.getElementById(speakingBtn.dataset.ttsTarget);
        if (s) s.classList.remove("is-speaking");
      }
      speakingBtn = null;
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
          b.querySelector("span").textContent = ui.tts_unavailable; return;
        }
        if (speakingBtn === b) { stop(); return; }
        stop();
        var section = document.getElementById(b.dataset.ttsTarget);
        // 中文朗讀遇到長句有時會被瀏覽器截斷，所以依句號切成幾段排隊念
        var chunks = textOf(section).match(/[^。！？!?；;]+[。！？!?；;]?/g) || [];
        var voice = pickVoice();
        var level = document.body.className.indexOf("level-L1") >= 0;
        chunks.forEach(function (c, i) {
          var u = new SpeechSynthesisUtterance(c);
          u.lang = SITE.tts; if (voice) u.voice = voice;
          u.rate = level ? 0.9 : 1;
          if (i === chunks.length - 1) u.onend = function () { if (speakingBtn === b) stop(); };
          synth.speak(u);
        });
        speakingBtn = b;
        b.classList.add("is-speaking");
        b.querySelector("span").textContent = ui.stop_reading;
        section.classList.add("is-speaking");
      });
    });
    window.addEventListener("pagehide", stop);
  }

  /* ---------------- 小測驗 ---------------- */
  function initQuizzes() {
    var article = document.querySelector("[data-progress-key]");
    document.querySelectorAll(".quiz[data-quiz]").forEach(function (box, qi) {
      var items;
      try { items = JSON.parse(box.dataset.quiz); } catch (e) { return; }
      var name = "quiz" + qi;
      items.forEach(function (it, i) {
        var fs = document.createElement("fieldset");
        fs.className = "quiz__q";
        var lg = document.createElement("legend");
        lg.textContent = (i + 1) + ". " + it.q;
        fs.appendChild(lg);
        it.options.forEach(function (o, oi) {
          var id = name + "-" + i + "-" + oi;
          var lab = document.createElement("label");
          lab.className = "quiz__opt"; lab.htmlFor = id;
          lab.innerHTML = '<input type="radio" id="' + id + '" name="' + name + "-" + i + '" value="' + oi + '"><span></span>';
          lab.querySelector("span").textContent = o;
          fs.appendChild(lab);
        });
        var ex = document.createElement("div");
        ex.className = "quiz__explain"; ex.hidden = true; ex.innerHTML = it.explain;
        fs.appendChild(ex);
        box.appendChild(fs);
      });
      var bar = document.createElement("div");
      bar.className = "quiz__bar";
      bar.innerHTML = '<button type="button" class="ix-btn"></button><span class="quiz__score" aria-live="polite"></span>';
      var btn = bar.querySelector("button"), score = bar.querySelector(".quiz__score");
      btn.textContent = ui.quiz_check;
      box.appendChild(bar);
      var checked = false;
      btn.addEventListener("click", function () {
        var fss = box.querySelectorAll(".quiz__q");
        if (checked) {
          fss.forEach(function (fs) {
            fs.querySelectorAll("input").forEach(function (inp) { inp.checked = false; inp.disabled = false; });
            fs.querySelectorAll(".quiz__opt").forEach(function (l) { l.classList.remove("is-correct", "is-wrong"); });
            fs.querySelector(".quiz__explain").hidden = true;
          });
          score.textContent = ""; btn.textContent = ui.quiz_check; checked = false; return;
        }
        var right = 0;
        fss.forEach(function (fs, i) {
          var sel = fs.querySelector("input:checked");
          var opts = fs.querySelectorAll(".quiz__opt");
          opts[items[i].answer].classList.add("is-correct");
          if (sel && +sel.value === items[i].answer) right++;
          else if (sel) opts[+sel.value].classList.add("is-wrong");
          fs.querySelectorAll("input").forEach(function (inp) { inp.disabled = true; });
          fs.querySelector(".quiz__explain").hidden = false;
        });
        score.textContent = fmt(ui.quiz_score, { score: right, total: items.length }) + " " + (right === items.length ? "🎉" : "");
        btn.textContent = ui.quiz_retry; checked = true;
        if (article) Progress.update(function (d) {
          var e = Progress.entry(d, article.dataset.progressKey, article.dataset.level);
          e.quiz = { score: right, total: items.length, best: Math.max(right, (e.quiz && e.quiz.best) || 0) };
        });
      });
    });
  }

  /* ---------------- 互動元件 ---------------- */
  var helpers = {
    ui: ui,
    lang: SITE.lang,
    t: function (dict) { return (dict && (dict[SITE.lang] || dict["zh-TW"] || dict[Object.keys(dict)[0]])) || ""; },
    svg: function (tag, attrs, parent) {
      var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (var k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(el);
      return el;
    },
    el: function (tag, attrs, parent) {
      var el = document.createElement(tag);
      for (var k in attrs) {
        if (k === "text") el.textContent = attrs[k];
        else if (k === "html") el.innerHTML = attrs[k];
        else el.setAttribute(k, attrs[k]);
      }
      if (parent) parent.appendChild(el);
      return el;
    },
    // 讓 SVG 線條有手繪抖動感的濾鏡（每個元件各一份，避免 id 衝突）
    sketchDefs: function (svg, id) {
      var defs = helpers.svg("defs", {}, svg);
      defs.innerHTML =
        '<filter id="' + id + '-rough" x="-5%" y="-5%" width="110%" height="110%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>' +
        '<filter id="' + id + '-pencil" x="-5%" y="-5%" width="110%" height="110%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" result="g"/>' +
        '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.2 1.8" result="m"/>' +
        '<feComposite in="SourceGraphic" in2="m" operator="in" result="t"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n"/>' +
        '<feDisplacementMap in="t" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>';
      return defs;
    },
    reducedMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };
  var uid = 0;
  window.NobelIX = {
    register: function (name, mount) {
      document.querySelectorAll('[data-component="' + name + '"]').forEach(function (stage) {
        stage.innerHTML = "";
        try { mount(stage, helpers, "ix" + (++uid)); }
        catch (e) { stage.textContent = "互動元件載入失敗：" + e.message; if (window.console) console.error(e); }
      });
    }
  };

  initHome();
  initPrize();
  initTTS();
  initQuizzes();
})();
