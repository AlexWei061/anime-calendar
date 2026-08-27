(function (global) {
  "use strict";

  const api = { init() {} };

  global.AnimeCalendarTeach = api;
  if (global.document) api.init();
})(typeof window === "undefined" ? globalThis : window);
