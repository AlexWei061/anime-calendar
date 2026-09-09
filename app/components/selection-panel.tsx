import type { Season } from "../types";
import { useViewer } from "../hooks/use-viewer";
import { CoverArt } from "./cover-art";
import { SignInPrompt } from "./account";

export function SelectionPanel({ activeSeason }: { activeSeason: Season; }) {
  const { currentUser, selectedAnimeIds, selectionError, isSavingSelection, toggleAnimeSelection } = useViewer();
  const selectionLoadError = selectionError ?? (!currentUser ? "登录后可同步你的追番列表。" : null);
  return (
    <section className="anime-selection-panel" aria-labelledby="anime-selection-heading">
      <details className="anime-selection-details">
        <summary className="anime-selection-summary">
          <span className="section-kicker">选择番剧</span>
          <span className="anime-selection-title" id="anime-selection-heading">
            本季度想追什么？
          </span>
          <span className="anime-selection-summary-copy">
            选择会自动保存，并在登录同一账号的设备间同步。
          </span>
        </summary>
        {selectedAnimeIds ? (
          <div className="anime-selection-list">
            {activeSeason.anime.map((record) => (
              <label className="anime-selection" key={record.id}>
                <input
                  type="checkbox"
                  checked={selectedAnimeIds.includes(record.id)}
                  disabled={isSavingSelection}
                  onChange={() => void toggleAnimeSelection(record.id)}
                />
                <CoverArt anime={record} className="statistics-anime-card-cover" decorative />
                <span className="statistics-anime-card-content">
                  <strong title={record.titleZh}>{record.titleZh}</strong>
                  <small title={record.titleJa}>{record.titleJa}</small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="selection-status" aria-live="polite">
            {selectionLoadError ?? "正在读取你的追番列表…"}
            {selectionLoadError ? <SignInPrompt /> : null}
          </p>
        )}
        {selectedAnimeIds && selectionLoadError ? (
          <p className="selection-status" aria-live="polite">
            {selectionLoadError}
          </p>
        ) : null}
      </details>
    </section>
  );
}
