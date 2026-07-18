function normalizedTitleText(value) {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

export function matchesAnimeTitle({ titleZh, titleJa }, query) {
  const normalizedQuery = normalizedTitleText(query);
  if (!normalizedQuery) return true;

  return [titleZh, titleJa].some((title) => normalizedTitleText(title).includes(normalizedQuery));
}
