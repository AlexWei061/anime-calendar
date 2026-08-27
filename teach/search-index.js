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
  ];
})(typeof window === "undefined" ? globalThis : window);
