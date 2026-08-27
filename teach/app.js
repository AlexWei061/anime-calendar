(function (global) {
  "use strict";

  const STORAGE_PREFIX = "anime-calendar-teach:";

  function normalizeSearch(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\\/_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function searchEntries(entries, query) {
    const terms = normalizeSearch(query).split(" ").filter(Boolean);
    if (!terms.length) return [];

    return entries.filter((entry) => {
      const haystack = normalizeSearch(
        [
          entry.title,
          entry.path,
          entry.section,
          entry.summary,
          ...(entry.keywords ?? []),
        ].join(" "),
      );
      return terms.every((term) => haystack.includes(term));
    });
  }

  function readJson(storage, key, fallback) {
    try {
      const raw = storage?.getItem(STORAGE_PREFIX + key);
      return raw === null || raw === undefined ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage?.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function pagePath(document, path) {
    const root = document.documentElement.dataset.root || ".";
    return root === "." ? path : `${root}/${path}`;
  }

  function createActionButton(document, label, title) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button";
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    return button;
  }

  function initTheme(document) {
    const storedTheme = readJson(global.localStorage, "theme", null);
    const systemDark = global.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : systemDark
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = initialTheme;

    const button = createActionButton(
      document,
      initialTheme === "dark" ? "☀" : "◐",
      "切换深浅色主题",
    );
    button.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      button.textContent = nextTheme === "dark" ? "☀" : "◐";
      writeJson(global.localStorage, "theme", nextTheme);
    });
    return button;
  }

  function initSearch(document) {
    const dialog = document.createElement("dialog");
    dialog.className = "search-dialog";
    dialog.setAttribute("aria-labelledby", "teach-search-title");
    dialog.innerHTML = `
      <div class="search-dialog-head">
        <div>
          <p class="eyebrow">LOCAL INDEX</p>
          <h2 id="teach-search-title">搜索课程、文件或症状</h2>
        </div>
        <button type="button" class="dialog-close" aria-label="关闭搜索">×</button>
      </div>
      <label class="search-field">
        <span>关键词</span>
        <input type="search" autocomplete="off" placeholder="例如：401、凌晨、db.batch、app/page.tsx">
      </label>
      <p class="search-hint">可搜索概念、文件名、HTTP 状态码和维护任务。</p>
      <div class="search-results" aria-live="polite"></div>
    `;
    document.body.append(dialog);

    const input = dialog.querySelector("input");
    const results = dialog.querySelector(".search-results");
    const close = dialog.querySelector(".dialog-close");
    const entries = Array.isArray(global.ANIME_CALENDAR_TEACH_INDEX)
      ? global.ANIME_CALENDAR_TEACH_INDEX
      : [];
    let opener = null;

    function appendLink(entry) {
      const link = document.createElement("a");
      link.className = "search-result";
      link.href = pagePath(document, entry.path);
      const meta = document.createElement("span");
      meta.className = "search-result-meta";
      meta.textContent = entry.section;
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const summary = document.createElement("span");
      summary.textContent = entry.summary;
      link.append(meta, title, summary);
      results.append(link);
    }

    function renderResults() {
      results.replaceChildren();
      const matches = searchEntries(entries, input.value);
      if (!input.value.trim()) {
        const prompt = document.createElement("p");
        prompt.className = "empty-search";
        prompt.textContent = "输入关键词后，这里会列出匹配的知识节点。";
        results.append(prompt);
        return;
      }
      if (!matches.length) {
        const empty = document.createElement("div");
        empty.className = "empty-search";
        empty.append("没有直接匹配。可以先查看 ");
        const mapLink = document.createElement("a");
        mapLink.href = pagePath(document, "map.html");
        mapLink.textContent = "项目地图";
        const referenceLink = document.createElement("a");
        referenceLink.href = pagePath(document, "reference.html");
        referenceLink.textContent = "速查页";
        empty.append(mapLink, " 或 ", referenceLink, "。");
        results.append(empty);
        return;
      }
      matches.slice(0, 12).forEach(appendLink);
    }

    function openSearch(source) {
      opener = source ?? document.activeElement;
      renderResults();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      global.setTimeout?.(() => input.focus(), 0);
    }

    function closeSearch() {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }

    input.addEventListener("input", renderResults);
    close.addEventListener("click", closeSearch);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeSearch();
    });
    dialog.addEventListener("close", () => opener?.focus?.());

    const button = createActionButton(document, "⌕", "搜索教学网站");
    button.addEventListener("click", () => openSearch(button));
    return { button, closeSearch, openSearch };
  }

  function initProgress(document) {
    const stored = readJson(global.localStorage, "progress", []);
    const completed = new Set(
      Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [],
    );
    const checks = [...document.querySelectorAll("[data-progress-id]")];

    function updateSummary() {
      document.querySelectorAll("[data-progress-summary]").forEach((summary) => {
        summary.replaceChildren();
        const title = document.createElement("strong");
        title.textContent = completed.size ? `已完成 ${completed.size} 个节点` : "尚未开始";
        const note = document.createElement("span");
        note.textContent = completed.size
          ? "进度只保存在这台设备的浏览器里。"
          : "完成知识节点后，这里会显示你的进度。";
        summary.append(title, note);
      });
    }

    checks.forEach((check) => {
      const id = check.dataset.progressId;
      if (!id) return;
      check.checked = completed.has(id);
      check.addEventListener("change", () => {
        if (check.checked) completed.add(id);
        else completed.delete(id);
        writeJson(global.localStorage, "progress", [...completed]);
        updateSummary();
      });
    });
    updateSummary();
    return completed;
  }

  function initCopyButtons(document) {
    document.querySelectorAll("[data-copy]").forEach((block) => {
      if (block.querySelector(":scope > .copy-button")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-button";
      button.textContent = "复制";
      button.addEventListener("click", async () => {
        const target = block.querySelector("code") ?? block;
        try {
          await global.navigator?.clipboard?.writeText(target.textContent ?? "");
          button.textContent = "已复制";
          global.setTimeout?.(() => {
            button.textContent = "复制";
          }, 1400);
        } catch {
          button.textContent = "请手动选择";
        }
      });
      block.prepend(button);
    });
  }

  function initQuizzes(document) {
    document.querySelectorAll("[data-quiz]").forEach((quiz) => {
      const feedback = quiz.querySelector("[data-quiz-feedback]");
      quiz.querySelectorAll("[data-quiz-choice]").forEach((choice) => {
        choice.setAttribute("aria-pressed", "false");
        choice.addEventListener("click", () => {
          quiz.querySelectorAll("[data-quiz-choice]").forEach((candidate) => {
            candidate.setAttribute("aria-pressed", String(candidate === choice));
          });
          if (!feedback) return;
          const correct = choice.dataset.correct === "true";
          feedback.hidden = false;
          feedback.dataset.result = correct ? "correct" : "incorrect";
          feedback.textContent =
            choice.dataset.answer || (correct ? "回答正确。" : "再看一眼上面的不变量。");
        });
      });
    });
  }

  function initFlowControls(document) {
    const controls = [...document.querySelectorAll("[data-flow-control]")];
    const nodes = [...document.querySelectorAll("[data-flows]")];
    controls.forEach((control) => {
      control.setAttribute("aria-pressed", "false");
      control.addEventListener("click", () => {
        const flow = control.dataset.flowControl;
        controls.forEach((candidate) => {
          candidate.setAttribute("aria-pressed", String(candidate === control));
        });
        nodes.forEach((node) => {
          const active = (node.dataset.flows || "").split(/\s+/).includes(flow);
          node.classList.toggle("is-flow-active", active);
          let label = node.querySelector(".flow-active-label");
          if (active && !label) {
            label = document.createElement("span");
            label.className = "flow-active-label";
            label.textContent = "路径中";
            node.append(label);
          } else if (!active) {
            label?.remove();
          }
        });
      });
    });
  }

  function isTypingTarget(target) {
    return target?.matches?.("input, textarea, select, button, [contenteditable='true']");
  }

  function initPresentation(document) {
    const slides = [...document.querySelectorAll("[data-slide]")];
    if (!slides.length) return null;

    let index = 0;
    let previousScroll = 0;
    const toolbar = document.createElement("div");
    toolbar.className = "presentation-toolbar";
    toolbar.hidden = true;
    toolbar.innerHTML = `
      <button type="button" data-presentation-previous>上一页</button>
      <span data-presentation-status aria-live="polite"></span>
      <button type="button" data-presentation-next>下一页</button>
      <button type="button" data-presentation-exit>退出</button>
    `;
    document.body.append(toolbar);

    function render() {
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle("is-current-slide", slideIndex === index);
      });
      toolbar.querySelector("[data-presentation-status]").textContent = `${index + 1} / ${slides.length}`;
      toolbar.querySelector("[data-presentation-previous]").disabled = index === 0;
      toolbar.querySelector("[data-presentation-next]").disabled = index === slides.length - 1;
    }

    function enter() {
      previousScroll = global.scrollY || 0;
      index = Math.max(0, slides.findIndex((slide) => slide.getBoundingClientRect().top >= 0));
      document.body.classList.add("is-presenting");
      toolbar.hidden = false;
      render();
      global.scrollTo?.(0, 0);
    }

    function exit() {
      document.body.classList.remove("is-presenting");
      toolbar.hidden = true;
      slides.forEach((slide) => slide.classList.remove("is-current-slide"));
      global.scrollTo?.(0, previousScroll);
    }

    function move(delta) {
      index = Math.max(0, Math.min(slides.length - 1, index + delta));
      render();
    }

    toolbar
      .querySelector("[data-presentation-previous]")
      .addEventListener("click", () => move(-1));
    toolbar
      .querySelector("[data-presentation-next]")
      .addEventListener("click", () => move(1));
    toolbar.querySelector("[data-presentation-exit]").addEventListener("click", exit);

    const button = createActionButton(document, "▣", "进入演示模式");
    button.dataset.presentationToggle = "";
    button.addEventListener("click", enter);
    return { button, enter, exit, move };
  }

  function init() {
    const document = global.document;
    if (!document) return;

    document.documentElement.classList.add("has-js");
    const actions = document.querySelector("[data-enhancement-actions]");
    const themeButton = initTheme(document);
    const search = initSearch(document);
    const presentation = initPresentation(document);
    actions?.append(themeButton, search.button);
    if (presentation) actions?.append(presentation.button);

    initProgress(document);
    initCopyButtons(document);
    initQuizzes(document);
    initFlowControls(document);

    document.addEventListener("keydown", (event) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        search.openSearch(event.target);
        return;
      }
      if (!document.body.classList.contains("is-presenting") || !presentation) return;
      if (event.key === "ArrowLeft") presentation.move(-1);
      else if (event.key === "ArrowRight") presentation.move(1);
      else if (event.key === "Escape") presentation.exit();
    });
  }

  const api = {
    init,
    normalizeSearch,
    pagePath,
    readJson,
    searchEntries,
    writeJson,
  };

  global.AnimeCalendarTeach = api;
  if (global.document) init();
})(typeof window === "undefined" ? globalThis : window);
