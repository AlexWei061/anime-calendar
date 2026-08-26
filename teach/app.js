/* 番剧日历 · 教学站 —— 全站交互脚本（无依赖，可直接 file:// 打开） */
(() => {
  "use strict";

  /* ============ 章节元数据（新增章节只需在这里登记） ============ */
  const CHAPTERS = [
    { file: "index.html",     num: "首页", id: "index",    title: "学习路线图",             tag: "起点" },
    { file: "01-jsts.html",   num: "01",   id: "01",       title: "JS / TS 速通",           tag: "语言" },
    { file: "02-web.html",    num: "02",   id: "02",       title: "网页是怎么跑起来的",     tag: "原理" },
    { file: "03-react.html",  num: "03",   id: "03",       title: "React：视图 = 状态的函数", tag: "前端" },
    { file: "04-architecture.html", num: "04", id: "04",   title: "项目全景图",             tag: "项目" },
    { file: "05-data.html",   num: "05",   id: "05",       title: "数据层：番剧数据从哪来", tag: "项目" },
    { file: "06-algorithms.html", num: "06", id: "06",     title: "核心算法精讲",           tag: "算法" },
    { file: "07-backend.html", num: "07",  id: "07",       title: "后端与数据库",           tag: "后端" },
    { file: "08-auth.html",   num: "08",   id: "08",       title: "账号与会话安全",         tag: "后端" },
    { file: "09-tooling.html", num: "09",  id: "09",       title: "工具链与测试",           tag: "工程" },
    { file: "10-maintenance.html", num: "10", id: "10",    title: "维护手册 SOP",           tag: "实战" },
    { file: "11-debug.html",  num: "11",   id: "11",       title: "修 bug 方法论",          tag: "实战" },
    { file: "12-exercises.html", num: "12", id: "12",      title: "练习题与自测",           tag: "实战" },
    { file: "appendix.html",  num: "附录", id: "appendix", title: "术语表 · 命令卡 · 报错速查", tag: "参考" },
  ];

  const chapterId = document.body.dataset.chapter || "index";
  const currentIndex = Math.max(0, CHAPTERS.findIndex((c) => c.id === chapterId));
  const current = CHAPTERS[currentIndex];

  /* ============ 小工具 ============ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const storage = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* file:// 下可能受限，忽略 */ }
    },
  };

  /* ============ 主题 ============ */
  function applyTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    if (persist) storage.set("teach-theme", theme);
    const btn = $(".theme-btn");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  (() => {
    const saved = storage.get("teach-theme", null);
    const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(saved || preferred, false);
  })();

  /* ============ 注入头部与底部 ============ */
  function injectChrome() {
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <div class="header-row">
        <a class="site-title" href="index.html"><span class="logo">📺</span>番剧日历 · 教学站</a>
        <div class="header-actions">
          <span class="chapter-progress">正在加载进度…</span>
          <button class="icon-btn theme-btn" title="切换深色 / 浅色主题" aria-label="切换主题">🌙</button>
          <button class="icon-btn slide-btn" title="演示模式：像 PPT 一样翻页（Esc 退出）" aria-label="演示模式">📽</button>
        </div>
      </div>
      <nav class="site-nav">${CHAPTERS.map((c) =>
        `<a href="${c.file}"${c.id === current.id ? ' class="current"' : ""}>${c.num} ${c.title}</a>`,
      ).join("")}</nav>
      <div class="progress-track"><div class="progress-fill"></div></div>
    `;
    document.body.prepend(header);

    const prev = CHAPTERS[currentIndex - 1];
    const next = CHAPTERS[currentIndex + 1];
    const footer = document.createElement("footer");
    footer.className = "page-nav";
    footer.innerHTML = `
      ${prev ? `<a class="prev" href="${prev.file}"><span class="dir">← 上一章</span>${prev.num} ${prev.title}</a>` : "<span></span>"}
      ${next ? `<a class="next" href="${next.file}"><span class="dir">下一章 →</span>${next.num} ${next.title}</a>` : "<span></span>"}
    `;
    document.body.append(footer);

    const toTop = document.createElement("button");
    toTop.className = "to-top";
    toTop.textContent = "↑ 回到顶部";
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.append(toTop);
    window.addEventListener("scroll", () => {
      toTop.classList.toggle("show", window.scrollY > 600);
    }, { passive: true });

    $(".theme-btn").addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, true);
    });
  }

  /* ============ 自动生成章节目录 ============ */
  function buildToc() {
    const toc = $("nav.chapter-toc[data-auto-toc]");
    if (!toc) return;
    const sections = $$("main > section");
    toc.innerHTML = `<div class="toc-title">📑 本章目录（点击直达）</div><ol>${sections
      .map((section) => {
        const heading = $("h2", section);
        const num = $(".sec-num", section)?.textContent?.trim() ?? "";
        const raw = heading ? heading.textContent.trim() : "未命名小节";
        const label = num ? raw.replace(new RegExp(`^${num}`), "").trim() : raw;
        return `<li><a href="#${section.id}">${label || raw}</a></li>`;
      })
      .join("")}</ol>`;
  }

  /* ============ “本节已掌握”勾选 + 进度 ============ */
  function wireProgress() {
    const sections = $$("main > section");
    const state = storage.get("teach-progress", {});
    const done = state[chapterId] || [];

    sections.forEach((section, i) => {
      const key = `${chapterId}:${i}`;
      const row = document.createElement("div");
      row.className = "section-done";
      row.innerHTML = `<label><input type="checkbox" data-section-key="${key}" ${done.includes(key) ? "checked" : ""}> 本节我已掌握</label>`;
      section.append(row);
      $("input", row).addEventListener("change", (event) => {
        const all = storage.get("teach-progress", {});
        const list = all[chapterId] || [];
        const k = event.target.dataset.sectionKey;
        const nextList = event.target.checked ? Array.from(new Set([...list, k])) : list.filter((x) => x !== k);
        all[chapterId] = nextList;
        storage.set("teach-progress", all);
        updateProgress(nextList.length);
      });
    });

    updateProgress(done.length);

    function updateProgress(doneCount) {
      $(".chapter-progress").textContent =
        sections.length ? `本章进度 ${doneCount} / ${sections.length}` : "";
      $(".progress-fill").style.width =
        sections.length ? `${(doneCount / sections.length) * 100}%` : "0";
    }
  }

  /* ============ 测验引擎 ============ */
  function wireQuizzes() {
    $$("form.quiz").forEach((form) => {
      const answers = new Set((form.dataset.answer || "").split(",").map((s) => s.trim().toUpperCase()));
      const options = $$(".quiz-opt", form);
      const feedback = $(".quiz-feedback", form);
      const submit = $('button[type="submit"]', form);
      const reset = $(".quiz-reset", form);

      const resetQuiz = () => {
        options.forEach((opt) => {
          opt.classList.remove("is-correct", "is-wrong");
          const input = $("input", opt);
          input.disabled = false;
          input.checked = false;
          const mark = $(".mark", opt);
          if (mark) mark.textContent = "";
        });
        if (feedback) feedback.hidden = true;
        if (submit) submit.hidden = false;
        if (reset) reset.hidden = true;
      };

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const pickedInputs = $$("input:checked", form);
        if (!pickedInputs.length) return;
        const pickedSet = new Set(pickedInputs.map((input) => input.value.toUpperCase()));
        const pass =
          pickedSet.size === answers.size && [...answers].every((answer) => pickedSet.has(answer));

        options.forEach((opt) => {
          const input = $("input", opt);
          input.disabled = true;
          const isCorrect = answers.has(input.value.toUpperCase());
          if (isCorrect) {
            opt.classList.add("is-correct");
            const mark = $(".mark", opt);
            if (mark) mark.textContent = "✓";
          } else if (input.checked) {
            opt.classList.add("is-wrong");
            const mark = $(".mark", opt);
            if (mark) mark.textContent = "✗";
          }
        });

        if (feedback) {
          const verdict = $(".verdict", feedback);
          if (verdict) {
            verdict.textContent = pass ? "✅ 答对了！" : "❌ 答错了，正确答案已标出，看看解释：";
            verdict.className = `verdict ${pass ? "pass" : "fail"}`;
          }
          feedback.hidden = false;
        }
        if (submit) submit.hidden = true;
        if (reset) reset.hidden = false;
      });

      if (reset) reset.addEventListener("click", resetQuiz);
    });
  }

  /* ============ 简易代码高亮 ============ */
  const KEYWORDS = {
    js: "const|let|var|function|return|if|else|for|while|new|class|extends|export|import|from|default|async|await|try|catch|throw|typeof|instanceof|null|undefined|true|false|switch|case|break|continue|do|in|of|this|static|type|interface|readonly|as|satisfies|yield|void|delete",
    ts: "const|let|var|function|return|if|else|for|while|new|class|extends|export|import|from|default|async|await|try|catch|throw|typeof|instanceof|null|undefined|true|false|switch|case|break|continue|do|in|of|this|static|type|interface|readonly|as|satisfies|yield|void|delete|keyof|enum|declare",
    sql: "select|from|where|insert|into|values|update|set|delete|create|table|primary|key|not|null|unique|index|on|conflict|do|nothing|and|or|join|inner|left|right|as|order|by|limit|integer|text|references|if|exists|begin|commit",
    bash: "npm|node|pnpm|git|cd|ls|cat|echo|export|curl|open",
    json: "true|false|null",
  };
  const RULES = {
    js: (k) => [
      { cls: "tok-c", re: /\/\/[^\n]*|\/\*[\s\S]*?\*\//g },
      { cls: "tok-s", re: /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g },
      { cls: "tok-k", re: new RegExp(`\\b(?:${k})\\b`, "g") },
      { cls: "tok-n", re: /\b\d[\d_]*(?:\.\d+)?\b|\b0x[0-9a-fA-F]+\b/g },
    ],
    ts: (k) => RULES.js(k),
    sql: (k) => [
      { cls: "tok-c", re: /--[^\n]*/g },
      { cls: "tok-s", re: /'[^']*'/g },
      { cls: "tok-k", re: new RegExp(`\\b(?:${k})\\b`, "gi") },
      { cls: "tok-n", re: /\b\d+\b/g },
    ],
    bash: () => [
      { cls: "tok-c", re: /#[^\n]*/g },
      { cls: "tok-s", re: /'[^']*'|"[^"]*"/g },
      { cls: "tok-k", re: /(^|[\s;&|])(?:npm|node|pnpm|git|cd|ls|cat|echo|export|curl|open|rm|mkdir)(?=\s|$)/g },
      { cls: "tok-v", re: /\$[A-Za-z_][A-Za-z0-9_]*|--[a-z-]+/g },
    ],
    json: (k) => [
      { cls: "tok-s", re: /"(?:[^"\\\n]|\\.)*"(?=\s*:)/g },
      { cls: "tok-k", re: new RegExp(`\\b(?:${k})\\b`, "g") },
      { cls: "tok-n", re: /\b\d+(?:\.\d+)?\b/g },
    ],
  };

  function tokenize(text, rules) {
    const matches = [];
    for (const { cls, re } of rules) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (m[0]) matches.push({ start: m.index, end: m.index + m[0].length, cls });
        if (m.index === re.lastIndex) re.lastIndex += 1;
      }
    }
    matches.sort((a, b) => a.start - b.start || b.end - a.end);
    const out = [];
    let pos = 0;
    for (const t of matches) {
      if (t.start < pos) continue;
      if (t.start > pos) out.push({ text: text.slice(pos, t.start), cls: null });
      out.push({ text: text.slice(t.start, t.end), cls: t.cls });
      pos = t.end;
    }
    if (pos < text.length) out.push({ text: text.slice(pos), cls: null });
    return out;
  }

  function highlightCode() {
    $$("pre code").forEach((block) => {
      const lang = Array.from(block.classList).find((c) => c.startsWith("lang-"))?.slice(5);
      const rules = lang && RULES[lang] ? RULES[lang](KEYWORDS[lang] || "") : null;
      if (!rules) return;
      const text = block.textContent;
      block.textContent = "";
      for (const tok of tokenize(text, rules)) {
        if (!tok.cls) block.append(document.createTextNode(tok.text));
        else {
          const span = document.createElement("span");
          span.className = tok.cls;
          span.textContent = tok.text;
          block.append(span);
        }
      }
    });

    $$(".codeblock pre").forEach((pre) => {
      const btn = document.createElement("button");
      btn.className = "code-copy";
      btn.textContent = "复制";
      btn.type = "button";
      btn.addEventListener("click", () => {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        try {
          document.execCommand("copy");
          btn.textContent = "已复制 ✓";
        } catch { /* 忽略复制失败 */ }
        selection.removeAllRanges();
        setTimeout(() => { btn.textContent = "复制"; }, 1600);
      });
      const head = $(".codehead", pre.parentElement);
      if (head) head.append(btn);
    });
  }

  /* ============ 演示（PPT）模式 ============ */
  let slideIndex = 0;
  function enterSlides() {
    document.body.classList.add("slides");
    slideIndex = 0;
    const controls = document.createElement("div");
    controls.className = "slide-controls";
    controls.innerHTML = `
      <button class="btn ghost slide-prev" type="button">←</button>
      <span class="count"></span>
      <button class="btn slide-next" type="button">→</button>
      <button class="btn ghost slide-exit" type="button">退出</button>
    `;
    document.body.append(controls);
    const sections = $$("main > section");
    const render = () => {
      sections.forEach((s, i) => s.classList.toggle("active", i === slideIndex));
      $(".count", controls).textContent = `${slideIndex + 1} / ${sections.length}`;
    };
    $(".slide-prev", controls).addEventListener("click", () => {
      slideIndex = Math.max(0, slideIndex - 1); render();
    });
    $(".slide-next", controls).addEventListener("click", () => {
      slideIndex = Math.min(sections.length - 1, slideIndex + 1); render();
    });
    $(".slide-exit", controls).addEventListener("click", exitSlides);
    render();
    window.scrollTo({ top: 0 });
  }
  function exitSlides() {
    document.body.classList.remove("slides");
    $(".slide-controls")?.remove();
  }

  /* ============ 键盘导航 ============ */
  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return;

    if (event.key === "Escape" && document.body.classList.contains("slides")) {
      exitSlides();
      return;
    }
    if (document.body.classList.contains("slides")) {
      if (event.key === "ArrowRight") document.querySelector(".slide-next")?.click();
      else if (event.key === "ArrowLeft") document.querySelector(".slide-prev")?.click();
      return;
    }
    if (event.key === "ArrowRight" && CHAPTERS[currentIndex + 1]) location.href = CHAPTERS[currentIndex + 1].file;
    if (event.key === "ArrowLeft" && CHAPTERS[currentIndex - 1]) location.href = CHAPTERS[currentIndex - 1].file;
  });

  /* ============ 启动 ============ */
  injectChrome();
  buildToc();
  wireProgress();
  wireQuizzes();
  highlightCode();
  $(".slide-btn")?.addEventListener("click", enterSlides);
})();
