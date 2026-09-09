import { CoverArt } from "./cover-art";
import { useAnimeDetail } from "./anime-detail";
import type { Anime, DetailSelection } from "../types";

export function StatisticsAnimeCard({ record, description, status, selection = {}, watchedEpisodeCount }: {
  record: Anime;
  description: string;
  status?: string;
  selection?: DetailSelection;
  watchedEpisodeCount?: number;
}) {
  const openDetail = useAnimeDetail();
  return (
    <button
      className="statistics-anime-card"
      type="button"
      aria-haspopup="dialog"
      aria-label={`查看《${record.titleZh}／${record.titleJa}》详情`}
      onClick={(clickEvent) => openDetail(record, clickEvent.currentTarget, selection)}
    >
      <CoverArt anime={record} className="statistics-anime-card-cover" decorative />
      <span className="statistics-anime-card-content">
        <strong>{record.titleZh}</strong>
        <small>{record.titleJa}</small>
        <em>{description}</em>
        {watchedEpisodeCount !== undefined ? (
          <span className="statistics-anime-card-progress" aria-hidden="true">
            <span style={{ width: `${(watchedEpisodeCount / record.episodeCount) * 100}%` }} />
          </span>
        ) : null}
      </span>
      {status ? <span className="statistics-anime-card-status">{status}</span> : null}
    </button>
  );
}
