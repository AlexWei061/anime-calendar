"use client";

import { useEffect, useSyncExternalStore } from "react";
import { calendarDateForDateTime } from "../../lib/calendar.js";

const beijingDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getBeijingDateTime() {
  const parts = Object.fromEntries(
    beijingDateTimeFormatter
      .formatToParts(new Date())
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function getServerBeijingDateTime() {
  return null;
}

// 所有时钟订阅者共享一个分钟级 interval；按值比较的字符串快照让
// 日粒度订阅者只在日期变化时重渲染。
const beijingClockListeners = new Set<() => void>();
let beijingClockInterval: number | null = null;

function notifyBeijingClockListeners() {
  for (const listener of beijingClockListeners) listener();
}

function subscribeToBeijingClock(onStoreChange: () => void) {
  beijingClockListeners.add(onStoreChange);
  beijingClockInterval ??= window.setInterval(notifyBeijingClockListeners, 60_000);
  return () => {
    beijingClockListeners.delete(onStoreChange);
    if (!beijingClockListeners.size && beijingClockInterval !== null) {
      window.clearInterval(beijingClockInterval);
      beijingClockInterval = null;
    }
  };
}

function getBeijingDate() {
  return getBeijingDateTime().slice(0, 10);
}

function getBeijingCalendarDate() {
  const currentBeijingDateTime = getBeijingDateTime();
  const currentBeijingDate = currentBeijingDateTime.slice(0, 10);
  const currentBeijingTime = currentBeijingDateTime.slice(11);
  return calendarDateForDateTime(currentBeijingDate, currentBeijingTime);
}

// 主题保存在 <html data-theme>（由 layout 内联脚本在首屏前写入），这里用
// useSyncExternalStore 订阅它；applyTheme 是唯一写入口，负责持久化并通知订阅者。
type ThemeName = "light" | "dark";

const themeListeners = new Set<() => void>();

function getThemeSnapshot(): ThemeName {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): ThemeName {
  return "light";
}

function subscribeToTheme(onStoreChange: () => void) {
  themeListeners.add(onStoreChange);
  return () => {
    themeListeners.delete(onStoreChange);
  };
}

function applyTheme(nextTheme: ThemeName, persist: boolean) {
  if (persist) {
    try {
      localStorage.setItem("ac-theme", nextTheme);
    } catch {
      // 存储失败时仅本次会话生效。
    }
  }
  document.documentElement.dataset.theme = nextTheme;
  for (const listener of themeListeners) listener();
}

export function useBeijingClock() {
  const currentBeijingDateTime = useSyncExternalStore<string | null>(
    subscribeToBeijingClock, getBeijingDateTime, getServerBeijingDateTime,
  );
  const currentBeijingDate = currentBeijingDateTime?.slice(0, 10) ?? null;
  const currentBeijingTime = currentBeijingDateTime?.slice(11) ?? null;
  const currentCalendarDate = currentBeijingDate && currentBeijingTime
    ? calendarDateForDateTime(currentBeijingDate, currentBeijingTime)
    : currentBeijingDate;
  return { currentBeijingDate, currentBeijingTime, currentCalendarDate };
}

// 日粒度订阅：快照是日期字符串，分钟跳动不会触发重渲染。
export function useBeijingDate() {
  return useSyncExternalStore(subscribeToBeijingClock, getBeijingDate, getServerBeijingDateTime);
}

export function useBeijingCalendarDate() {
  return useSyncExternalStore(subscribeToBeijingClock, getBeijingCalendarDate, getServerBeijingDateTime);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystemTheme = () => {
      try {
        if (localStorage.getItem("ac-theme")) return;
      } catch {
        // localStorage 不可用时按未手动选择处理。
      }
      applyTheme(systemTheme.matches ? "dark" : "light", false);
    };

    systemTheme.addEventListener("change", followSystemTheme);
    return () => systemTheme.removeEventListener("change", followSystemTheme);
  }, []);

  return { theme, toggleTheme: () => applyTheme(theme === "dark" ? "light" : "dark", true) };
}
