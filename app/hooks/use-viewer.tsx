"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { episodeViewKey, episodeViewUnitsForRange, isEpisodeViewWatched, updateEpisodeViews } from "../../lib/anime-episode-views.js";
import { restoreEpisodeViews } from "./library-state.js";
import type { AuthUser, WatchedEpisode } from "../types";

function parseUser(payload: unknown): AuthUser {
  if (!payload || typeof payload !== "object") throw new Error("账号信息无效，请重试。");
  const user = payload as Record<string, unknown>;
  if (typeof user.email !== "string" || typeof user.displayName !== "string" ||
    (typeof user.avatarUrl !== "string" && user.avatarUrl !== null)) {
    throw new Error("账号信息无效，请重试。");
  }
  return { email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

async function accountRequest(path: string, method: string, body?: unknown) {
  const response = await fetch(`/api/auth/${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "操作失败，请重试。");
  return payload;
}

function useViewerState() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isChangingSession, setIsChangingSession] = useState(false);
  const sessionMutationRef = useRef(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const sessionVersionRef = useRef(0);
  const [selectedAnimeIds, setSelectedAnimeIds] = useState<string[] | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const selectionSavingRef = useRef(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<WatchedEpisode[] | null>(null);
  const watchedEpisodesRef = useRef<WatchedEpisode[] | null>(null);
  const [watchedEpisodeError, setWatchedEpisodeError] = useState<string | null>(null);
  const [savingEpisodeKeys, setSavingEpisodeKeys] = useState<string[]>([]);
  const savingEpisodeKeysRef = useRef(new Set<string>());

  const replaceSession = (user: AuthUser | null) => {
    sessionVersionRef.current += 1;
    setSessionVersion(sessionVersionRef.current);
    setCurrentUser(user);
    setAuthLoaded(true);
    setSelectedAnimeIds(null);
    watchedEpisodesRef.current = null;
    setWatchedEpisodes(null);
    setSelectionError(null);
    setWatchedEpisodeError(null);
    selectionSavingRef.current = false;
    setIsSavingSelection(false);
    savingEpisodeKeysRef.current = new Set();
    setSavingEpisodeKeys([]);
  };

  useEffect(() => {
    const controller = new AbortController();
    const version = sessionVersionRef.current;
    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { signal: controller.signal });
        if (!response.ok) return;
        const user = parseUser(await response.json());
        if (!controller.signal.aborted && sessionVersionRef.current === version) setCurrentUser(user);
      } catch {
        // Unavailable sessions retain the signed-out view.
      } finally {
        if (!controller.signal.aborted && sessionVersionRef.current === version) setAuthLoaded(true);
      }
    })();
    return () => controller.abort();
  }, []);

  const userEmail = currentUser?.email;
  useEffect(() => {
    if (!userEmail) return;
    const controller = new AbortController();
    const version = sessionVersion;
    const isCurrent = () => !controller.signal.aborted && sessionVersionRef.current === version;

    void (async () => {
      try {
        const response = await fetch("/api/anime-selections", { signal: controller.signal });
        if (response.status === 401) {
          if (isCurrent()) setSelectionError("登录后可同步你的追番列表。");
          return;
        }
        if (!response.ok) throw new Error("Unable to load anime selections");
        const payload = await response.json();
        if (!Array.isArray(payload.animeIds) || payload.animeIds.some((id: unknown) => typeof id !== "string")) {
          throw new Error("Invalid anime selections");
        }
        if (isCurrent()) setSelectedAnimeIds(payload.animeIds);
      } catch {
        if (isCurrent()) setSelectionError("无法读取你的追番列表。请稍后重试。");
      }
    })();

    void (async () => {
      try {
        const response = await fetch("/api/anime-episode-views", { signal: controller.signal });
        if (response.status === 401) {
          if (isCurrent()) setWatchedEpisodeError("登录后可同步你的已看记录。");
          return;
        }
        if (!response.ok) throw new Error("Unable to load watched episodes");
        const payload = await response.json();
        if (!Array.isArray(payload.watchedEpisodes) || payload.watchedEpisodes.some((episode: WatchedEpisode) =>
          !episode || typeof episode !== "object" || typeof episode.animeId !== "string" ||
          !Number.isInteger(episode.episodeStart) || !Number.isInteger(episode.episode))) {
          throw new Error("Invalid watched episodes");
        }
        if (isCurrent()) {
          watchedEpisodesRef.current = payload.watchedEpisodes;
          setWatchedEpisodes(payload.watchedEpisodes);
        }
      } catch {
        if (isCurrent()) setWatchedEpisodeError("无法读取已看记录。请稍后重试。");
      }
    })();
    return () => controller.abort();
  }, [userEmail, sessionVersion]);

  // Set-Cookie is applied before React can reject a stale response.
  // Repeated clicks and all account entry points must share the same lock.
  const changeSession = async (request: () => Promise<void>) => {
    if (sessionMutationRef.current) throw new Error("账号操作正在进行，请稍候。");
    sessionMutationRef.current = true;
    setIsChangingSession(true);
    try {
      await request();
    } finally {
      sessionMutationRef.current = false;
      setIsChangingSession(false);
    }
  };

  const authenticate = (mode: "login" | "register", body: { email: string; password: string; displayName?: string; }) => changeSession(async () => {
    const version = sessionVersionRef.current;
    const user = parseUser(await accountRequest(mode, "POST", body));
    if (sessionVersionRef.current !== version) return;
    replaceSession(user);
  });

  const signOut = () => changeSession(async () => {
    const version = sessionVersionRef.current;
    await accountRequest("logout", "POST");
    if (sessionVersionRef.current === version) replaceSession(null);
  });

  const changePassword = (currentPassword: string, newPassword: string) => changeSession(async () => {
    const version = sessionVersionRef.current;
    await accountRequest("change-password", "POST", { currentPassword, newPassword });
    if (sessionVersionRef.current === version) replaceSession(null);
  });

  const updateAvatar = (avatarUrl: string | null) => {
    if (sessionVersionRef.current === sessionVersion) {
      setCurrentUser((user) => user ? { ...user, avatarUrl } : null);
    }
  };

  const deleteAvatar = async () => {
    const version = sessionVersionRef.current;
    await accountRequest("avatar", "DELETE");
    if (sessionVersionRef.current === version) updateAvatar(null);
  };

  const toggleAnimeSelection = async (animeId: string) => {
    if (!selectedAnimeIds || selectionSavingRef.current) return;
    const version = sessionVersionRef.current;
    const previousAnimeIds = selectedAnimeIds;
    const nextAnimeIds = selectedAnimeIds.includes(animeId)
      ? selectedAnimeIds.filter((id) => id !== animeId)
      : [...selectedAnimeIds, animeId];
    selectionSavingRef.current = true;
    setIsSavingSelection(true);
    setSelectedAnimeIds(nextAnimeIds);
    setSelectionError(null);
    try {
      const response = await fetch("/api/anime-selections", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ animeIds: nextAnimeIds }),
      });
      if (!response.ok) throw new Error("Unable to save anime selections");
    } catch {
      if (sessionVersionRef.current === version) {
        setSelectedAnimeIds(previousAnimeIds);
        setSelectionError("保存失败，请重试。");
      }
    } finally {
      if (sessionVersionRef.current === version) {
        selectionSavingRef.current = false;
        setIsSavingSelection(false);
      }
    }
  };

  const toggleEpisodeView = async (watchedEpisode: WatchedEpisode) => {
    const previous = watchedEpisodesRef.current;
    if (previous === null) return;
    const version = sessionVersionRef.current;
    const episodeViews = episodeViewUnitsForRange(watchedEpisode).map((unit) => ({ animeId: watchedEpisode.animeId, ...unit }));
    const keys = episodeViews.map(episodeViewKey);
    if (keys.some((key) => savingEpisodeKeysRef.current.has(key))) return;
    const watched = !isEpisodeViewWatched(previous, watchedEpisode);
    const next = updateEpisodeViews(previous, watchedEpisode, watched);
    watchedEpisodesRef.current = next;
    setWatchedEpisodes(next);
    setWatchedEpisodeError(null);
    for (const key of keys) savingEpisodeKeysRef.current.add(key);
    setSavingEpisodeKeys([...savingEpisodeKeysRef.current]);
    try {
      const response = await fetch("/api/anime-episode-views", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ watchedEpisodes: episodeViews, watched }),
      });
      if (!response.ok) throw new Error("Unable to save watched episode");
    } catch {
      if (sessionVersionRef.current === version && watchedEpisodesRef.current !== null) {
        const restored = restoreEpisodeViews(watchedEpisodesRef.current, previous, episodeViews);
        watchedEpisodesRef.current = restored;
        setWatchedEpisodes(restored);
        setWatchedEpisodeError("保存已看状态失败，请重试。");
      }
    } finally {
      if (sessionVersionRef.current === version) {
        for (const key of keys) savingEpisodeKeysRef.current.delete(key);
        setSavingEpisodeKeys([...savingEpisodeKeysRef.current]);
      }
    }
  };

  return {
    currentUser, authLoaded, isChangingSession, authenticate, signOut, changePassword, updateAvatar, deleteAvatar,
    selectedAnimeIds, selectionError, isSavingSelection, toggleAnimeSelection,
    watchedEpisodes, watchedEpisodeError, savingEpisodeKeys, toggleEpisodeView,
  };
}

const ViewerContext = createContext<ReturnType<typeof useViewerState> | null>(null);

export function ViewerProvider({ children }: { children: ReactNode; }) {
  return <ViewerContext.Provider value={useViewerState()}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const viewer = useContext(ViewerContext);
  if (!viewer) throw new Error("ViewerProvider is missing");
  return viewer;
}
