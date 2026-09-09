import { useMemo } from "react";
import { matchesAnimeTitle } from "../../lib/anime-search.js";
import { progressForAnime } from "../../lib/anime-statistics.js";
import { allAnime, seasonLabelByAnimeId } from "../catalog";
import { progressStatusLabel } from "../display";
import { useViewer } from "../hooks/use-viewer";
import { PageHeading } from "./page-heading";
import { StatisticsAnimeCard } from "./statistics-anime-card";
import type { AnimeProgress } from "../types";

export function SearchPage({ animeQuery, setAnimeQuery }: { animeQuery: string; setAnimeQuery: (query: string) => void; }) {
  const { currentUser, selectedAnimeIds, selectionError, watchedEpisodes, watchedEpisodeError } = useViewer();
  const hasAnimeQuery = animeQuery.trim().length > 0;
  const searchResults = useMemo(() => animeQuery.trim()
    ? allAnime.filter((record) => matchesAnimeTitle(record, animeQuery)) : [], [animeQuery]);
  const searchProgressByAnimeId = useMemo(() => new Map(
    (progressForAnime(searchResults, watchedEpisodes ?? []) as AnimeProgress[]).map((progress) => [progress.record.id, progress]),
  ), [searchResults, watchedEpisodes]);
  const selectionLoadError = selectionError ?? (!currentUser ? "登录后可同步你的追番列表。" : null);
  const searchProgressError = selectionLoadError ?? watchedEpisodeError;
  const isSearchProgressLoading = (selectedAnimeIds === null || watchedEpisodes === null) && !searchProgressError;
  return <>
    <PageHeading title="查询番剧" summary="搜索全部已收录番剧，支持中文和日文标题。" />
    <section className="anime-search-page" aria-labelledby="page-heading-title">
      <label className="anime-search">
        查询番剧
        <input
          type="search"
          value={animeQuery}
          onChange={(event) => setAnimeQuery(event.target.value)}
          placeholder="输入中文或日文名"
        />
      </label>
      {!hasAnimeQuery ? (
        <p className="anime-search-empty">输入中文或日文名开始查询。</p>
      ) : searchResults.length ? (
        isSearchProgressLoading ? (
          <p className="selection-status" aria-live="polite">
            {searchProgressError ?? "正在读取追番进度…"}
          </p>
        ) : (
          <div className="statistics-anime-card-list anime-search-results">
            {searchResults.map((record) => {
              const progress = searchProgressByAnimeId.get(record.id);
              if (!progress || selectedAnimeIds === null || watchedEpisodes === null) {
                return (
                  <span key={record.id}>
                    <StatisticsAnimeCard record={record} description={(seasonLabelByAnimeId.get(record.id) ?? "已收录番剧") +
                      " · 追番进度暂不可用"} status="进度暂不可用" />
                  </span>
                );
              }

              const isTracked = selectedAnimeIds.includes(record.id);
              return (
                <span key={record.id}>
                  <StatisticsAnimeCard record={record} description={(seasonLabelByAnimeId.get(record.id) ?? "已收录番剧") +
                    ` · 已看 ${progress.watchedEpisodeCount} / ${record.episodeCount} 集`} status={isTracked ? progressStatusLabel(progress.status) : "未追番"} watchedEpisodeCount={progress.watchedEpisodeCount} />
                </span>
              );
            })}
          </div>
        )
      ) : (
        <p className="anime-search-empty" aria-live="polite">
          未找到“{animeQuery.trim()}”相关的番剧。
        </p>
      )}
    </section>
  </>;
}
