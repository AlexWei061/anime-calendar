export function validateAnimeIds(value, validAnimeIds) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
    throw new TypeError("animeIds must be an array of strings");
  }

  const animeIds = [...new Set(value)];
  const unknownId = animeIds.find((id) => !validAnimeIds.has(id));
  if (unknownId) {
    throw new RangeError("Unknown anime ID: " + unknownId);
  }

  return animeIds;
}

export function filterKnownAnimeIds(value, validAnimeIds) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
    throw new TypeError("animeIds must be an array of strings");
  }

  return [...new Set(value)].filter((id) => validAnimeIds.has(id));
}
