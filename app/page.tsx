"use client";

import { useEffect, useRef, useState } from "react";
import { startOfWeek } from "../lib/calendar.js";
import { initialWeekStart } from "./catalog";
import { useBeijingClock, useTheme } from "./hooks/use-display";
import { ViewerProvider } from "./hooks/use-viewer";
import { AccountControls, AccountProvider } from "./components/account";
import { AnimeDetailProvider } from "./components/anime-detail";
import { CalendarPage } from "./components/calendar-page";
import { SearchPage } from "./components/search-page";
import { StatisticsPage } from "./components/statistics-page";
import type { CalendarLocation, Page, StatisticsView } from "./types";

function CalendarApp() {
  const [activePage, setActivePage] = useState<Page>("all");
  const [animeQuery, setAnimeQuery] = useState("");
  const [calendarLocation, setCalendarLocation] = useState<CalendarLocation>({
    weekStart: initialWeekStart,
    mobileDate: initialWeekStart,
  });
  const [statisticsView, setStatisticsView] = useState<StatisticsView>({ seasonId: "", collapsedSections: [] });
  const didSetInitialWeek = useRef(false);
  const { currentCalendarDate } = useBeijingClock();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!currentCalendarDate || didSetInitialWeek.current) return;
    didSetInitialWeek.current = true;
    setCalendarLocation({ weekStart: startOfWeek(currentCalendarDate), mobileDate: currentCalendarDate });
  }, [currentCalendarDate]);

  useEffect(() => {
    const syncPageFromUrl = () => {
      const page = new URLSearchParams(window.location.search).get("page");
      setActivePage(page === "mine" || page === "stats" || page === "search" ? page : "all");
    };
    syncPageFromUrl();
    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, []);

  const changePage = (page: Page) => {
    if (page === activePage) return;
    const url = new URL(window.location.href);
    if (page === "all") url.searchParams.delete("page");
    else url.searchParams.set("page", page);
    window.history.pushState(null, "", url);
    setActivePage(page);
  };
  const submitPageSearch = (query: string) => {
    setAnimeQuery(query);
    changePage("search");
  };

  return (
    <div className="site-shell">
      <nav className="page-sidebar" aria-label="页面导航">
        <p className="site-name">番时表</p>
        {([["all", "播出表"], ["mine", "我的番剧"], ["stats", "追番统计"]] as const).map(([page, label]) => (
          <button key={page} className={activePage === page ? "is-active" : ""} type="button"
            aria-current={activePage === page ? "page" : undefined} onClick={() => changePage(page)}>
            {label}
          </button>
        ))}
        <AccountControls />
      </nav>
      <main className="calendar-page">
        {activePage === "all" || activePage === "mine" ? (
          <CalendarPage activePage={activePage} location={calendarLocation} onLocationChange={setCalendarLocation} onSearch={submitPageSearch} />
        ) : activePage === "stats" ? (
          <StatisticsPage onSearch={submitPageSearch} view={statisticsView} onViewChange={setStatisticsView} />
        ) : (
          <SearchPage animeQuery={animeQuery} setAnimeQuery={setAnimeQuery} />
        )}
      </main>
      <button className="theme-toggle" type="button" aria-pressed={theme === "dark"}
        aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"} onClick={toggleTheme}>
        {theme === "dark" ? "浅色模式" : "深色模式"}
      </button>
    </div>
  );
}

export default function Home() {
  return <ViewerProvider><AccountProvider><AnimeDetailProvider><CalendarApp /></AnimeDetailProvider></AccountProvider></ViewerProvider>;
}
