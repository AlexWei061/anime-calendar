(function (global) {
  "use strict";

  global.ANIME_CALENDAR_TEACH_INDEX = [
    {
      id: "home",
      title: "学习与维护入口",
      path: "index.html",
      section: "首页",
      keywords: ["学习路线", "维护", "项目全景"],
      summary: "从系统课程或真实维护任务进入番剧日历项目。",
    },
    {
      id: "map",
      title: "项目地图与三条数据流",
      path: "map.html",
      section: "项目地图",
      keywords: ["架构", "数据流", "文件地图", "依赖", "data", "lib", "app", "D1"],
      summary: "按八层职责定位代码，并追踪日历、追番和登录的真实数据流。",
    },
    {
      id: "learn-language",
      title: "01 从 C++ / Python 迁移到 JS / TS",
      path: "learn/01-language.html",
      section: "系统课程",
      keywords: ["JavaScript", "TypeScript", "const", "async", "await", "对象", "数组"],
      summary: "把项目常见语法翻译回已有的数据结构、函数和控制流知识。",
    },
    {
      id: "learn-web",
      title: "02 网站如何运行",
      path: "learn/02-web.html",
      section: "系统课程",
      keywords: ["HTTP", "JSON", "Cookie", "localStorage", "401", "浏览器", "Worker"],
      summary: "区分浏览器、Cloudflare Worker、D1 和静态资源的运行边界。",
    },
    {
      id: "learn-react",
      title: "03 React 心智模型",
      path: "learn/03-react.html",
      section: "系统课程",
      keywords: ["React", "UI", "state", "useState", "useEffect", "JSX", "app/page.tsx"],
      summary: "用 UI = f(state) 拆解组件、派生值、effect、事件与大型 Home 页面。",
    },
    {
      id: "learn-architecture",
      title: "04 项目架构与数据流",
      path: "learn/04-architecture.html",
      section: "系统课程",
      keywords: ["data/anime.js", "lib/calendar.js", "app/api", "D1", "架构", "生成文件"],
      summary: "判断静态事实、纯算法、React、API 和个人数据应位于哪一层。",
    },
  ];
})(typeof window === "undefined" ? globalThis : window);
