import { createHash } from "node:crypto";

const titleKey = (value) => (value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
const digest = (value) => createHash("sha256").update(value).digest("hex").slice(0, 16);

// Source identifiers are persisted on the next import. Existing snapshots have
// only titles, so their first import requires a unique bilingual match per season.
export function createCatalogIdentityResolver(previousRecords) {
  const reservedIds = new Set(previousRecords.map(({ id }) => id));
  const usedIds = new Set();
  if (reservedIds.size !== previousRecords.length) throw new Error("Duplicate existing catalog IDs");

  function resolve(card, sourceUrl, suggestedId) {
    const previous = previousRecords.filter((record) => record.sourceUrl === sourceUrl);
    let matches = [];
    for (const [field, value] of [
      ["yucSourceId", card.yucSourceId],
      ["yucSourceUrl", card.yucSourceUrl],
      ["yucCoverUrl", card.coverUrl],
    ]) {
      if (!value) continue;
      matches = previous.filter((record) => record[field] === value);
      if (matches.length) break;
    }
    if (!matches.length) {
      matches = previous.filter((record) =>
        titleKey(record.titleJa) === titleKey(card.titleJa) &&
        titleKey(record.titleZh) === titleKey(card.titleZh));
      if (!matches.length && previous.some((record) =>
        titleKey(record.titleJa) === titleKey(card.titleJa) ||
        titleKey(record.titleZh) === titleKey(card.titleZh))) {
        throw new Error(`Unresolved changed YUC identity: ${sourceUrl} ${card.titleJa}`);
      }
    }
    if (matches.length > 1) {
      throw new Error(`Ambiguous YUC identity: ${sourceUrl} ${card.titleJa}; IDs: ${matches.map(({ id }) => id).join(", ")}`);
    }
    const existing = matches[0];
    const sourceKey = card.yucSourceId ?? card.yucSourceUrl ?? card.coverUrl;
    if (!sourceKey) throw new Error(`Missing stable YUC source: ${sourceUrl} ${card.titleJa}`);
    const season = /\/(\d{4})(\d{2})\/$/.exec(sourceUrl);
    if (!season) throw new Error(`Invalid YUC season URL: ${sourceUrl}`);
    const newId = suggestedId?.startsWith("anilist-") && !reservedIds.has(suggestedId) && !usedIds.has(suggestedId)
      ? suggestedId
      : `yuc-${season[1]}${season[2]}-${digest(`${sourceUrl}|${sourceKey}`)}`;
    const id = existing?.id ?? newId;
    if (usedIds.has(id)) throw new Error(`Duplicate imported YUC identity: ${id}`);
    if (!existing && reservedIds.has(id)) throw new Error(`YUC identity collides with existing ID: ${id}`);
    usedIds.add(id);
    return {
      id,
      coverUrl: existing?.coverUrl ?? `/covers/yuc/history-${season[1]}-${season[2]}-${digest(id)}.webp`,
      yucCoverUrl: card.coverUrl,
      ...((card.yucSourceId ?? existing?.yucSourceId) ? { yucSourceId: card.yucSourceId ?? existing.yucSourceId } : {}),
      ...((card.yucSourceUrl ?? existing?.yucSourceUrl) ? { yucSourceUrl: card.yucSourceUrl ?? existing.yucSourceUrl } : {}),
    };
  }

  resolve.assertComplete = (sourceUrls) => {
    const sources = new Set(sourceUrls);
    const missing = previousRecords.filter(({ id, sourceUrl }) => sources.has(sourceUrl) && !usedIds.has(id));
    if (missing.length) {
      throw new Error(`Missing existing YUC identities; review source changes before publishing: ${missing.map(({ id }) => id).join(", ")}`);
    }
  };
  return resolve;
}
