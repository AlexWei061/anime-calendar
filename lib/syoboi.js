const TELEVISION_CHANNEL_GROUPS = new Set([1, 2, 6, 8, 9, 11, 13, 14, 20, 21, 28]);

function elementItems(xml, name) {
  return [...xml.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "gi"))].map(([, value]) => value);
}

function elementText(xml, name) {
  const [value] = elementItems(xml, name);
  return value ? decodeXmlText(value).trim() : "";
}

function numberValue(value) {
  return /^\d+$/.test(value) ? Number(value) : null;
}

function dayDifference(left, right) {
  return (Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / (24 * 60 * 60 * 1000);
}

export function decodeXmlText(value) {
  return value.replace(/&(?:#x([\da-f]+)|#(\d+)|amp|lt|gt|quot|apos);/gi, (entity, hex, decimal) => {
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
    return { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" }[entity.toLowerCase()];
  });
}

export function parseTitleLookup(xml) {
  return elementItems(xml, "TitleItem")
    .map((item) => ({
      tid: numberValue(elementText(item, "TID")),
      title: elementText(item, "Title"),
      firstYear: numberValue(elementText(item, "FirstYear")),
      firstMonth: numberValue(elementText(item, "FirstMonth")),
    }))
    .filter(({ tid, title, firstYear, firstMonth }) => tid !== null && title && firstYear !== null && firstMonth !== null);
}

export function parseChannelLookup(xml) {
  return elementItems(xml, "ChItem")
    .map((item) => {
      const groupId = numberValue(elementText(item, "ChGID"));
      return {
        id: numberValue(elementText(item, "ChID")),
        name: elementText(item, "ChName"),
        groupId,
        kind: TELEVISION_CHANNEL_GROUPS.has(groupId) ? "television" : "internet",
      };
    })
    .filter(({ id, name }) => id !== null && name);
}

export function parseProgLookup(xml) {
  return elementItems(xml, "ProgItem")
    .map((item) => ({
      id: numberValue(elementText(item, "PID")),
      stTime: elementText(item, "StTime"),
      count: numberValue(elementText(item, "Count")),
      subtitle: elementText(item, "SubTitle"),
      flag: numberValue(elementText(item, "Flag")) ?? 0,
      deleted: numberValue(elementText(item, "Deleted")) ?? 0,
      channelId: numberValue(elementText(item, "ChID")),
    }))
    .filter(({ id, stTime, channelId }) => id !== null && stTime && channelId !== null);
}

export function episodeRange({ count, subtitle }) {
  if (count && count > 0) {
    const range = /#(\d+)\s*[〜～-]\s*#?(\d+)/.exec(subtitle);
    if (range) return { episodeStart: Number(range[1]), episodeEnd: Number(range[2]) };
    return { episodeStart: count, episodeEnd: count };
  }

  const range = /#(\d+)\s*[〜～-]\s*#?(\d+)/.exec(subtitle);
  if (range) return { episodeStart: Number(range[1]), episodeEnd: Number(range[2]) };
  const single = /#(\d+)/.exec(subtitle);
  return single ? { episodeStart: Number(single[1]), episodeEnd: Number(single[1]) } : null;
}

export function syoboiJstToBeijing(stTime) {
  const match = /^(\d{4})-?(\d{2})-?(\d{2})(?:_| )(\d{2}):?(\d{2}):?(\d{2})$/.exec(stTime);
  if (!match) throw new RangeError(`Invalid Syoboi time: ${stTime}`);

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Invalid Syoboi time: ${stTime}`);
  return {
    broadcastDateBeijing: date.toISOString().slice(0, 10),
    beijingTime: date.toISOString().slice(11, 16),
  };
}

export function choosePrimaryTelevisionSchedule(programs, channels) {
  const candidates = programs
    .filter((program) => {
      const range = episodeRange(program);
      return (
        program.deleted === 0 &&
        (program.flag & 0x8) === 0 &&
        channels.get(program.channelId)?.kind === "television" &&
        range?.episodeStart === 1
      );
    })
    .sort((left, right) => left.stTime.localeCompare(right.stTime) || left.id - right.id);
  const first = candidates[0];
  return first ? { channelId: first.channelId, firstProgramId: first.id } : null;
}

export function compressEpisodeSchedules(episodes) {
  const schedules = [];

  for (const episode of [...episodes].sort((left, right) => left.episodeStart - right.episodeStart)) {
    const intervalDays = episode.episodeStart === episode.episodeEnd ? 7 : 0;
    const previous = schedules.at(-1);
    if (
      previous &&
      previous.intervalDays === 7 &&
      intervalDays === 7 &&
      previous.beijingTime === episode.beijingTime &&
      previous.episodeEnd + 1 === episode.episodeStart &&
      dayDifference(episode.broadcastDateBeijing, previous.broadcastDateBeijing) ===
        7 * (episode.episodeStart - previous.episodeStart)
    ) {
      previous.episodeEnd = episode.episodeEnd;
    } else {
      schedules.push({ ...episode, intervalDays });
    }
  }

  return schedules;
}
