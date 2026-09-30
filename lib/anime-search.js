function normalizedTitleText(value) {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

// 目录条目对象身份稳定，归一化标题按条目缓存一次，而不是每次查询现场算。
const normalizedTitlesByRecord = new WeakMap();

function normalizedTitlesForRecord(record) {
  let titles = normalizedTitlesByRecord.get(record);
  if (!titles) {
    titles = [normalizedTitleText(record.titleZh), normalizedTitleText(record.titleJa)];
    normalizedTitlesByRecord.set(record, titles);
  }
  return titles;
}

export function matchesAnimeTitle(record, query) {
  const normalizedQuery = normalizedTitleText(query);
  if (!normalizedQuery) return true;

  return normalizedTitlesForRecord(record).some((title) => title.includes(normalizedQuery));
}
