export interface ScheduleItem {
  time: string | null;
  label: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  items: ScheduleItem[];
  markdown: string;
}

const dayHeadingPattern = /^## Day (\d+)｜(\d{1,2})\/(\d{1,2})（[^）]+）(.+)$/gm;
const tableRowPattern = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm;

function toIsoDate(month: string, day: string): string {
  return `2026-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseScheduleItems(markdown: string): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  for (const match of markdown.matchAll(tableRowPattern)) {
    const time = match[1]?.trim();
    const label = match[2]?.trim();

    if (!time || !label || time === "時間" || /^[-:]+$/.test(time)) {
      continue;
    }

    items.push({ time, label });
  }

  return items;
}

function parseTextRouteItems(markdown: string): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  const textBlockPattern = /```text\s*\n([\s\S]*?)```/g;

  for (const block of markdown.matchAll(textBlockPattern)) {
    const route = block[1];

    if (!route) {
      continue;
    }

    for (const rawLine of route.split("\n")) {
      const line = rawLine.trim().replace(/^→\s*/, "");

      if (!line) {
        continue;
      }

      const timedLine = line.match(/^(\d{2}:\d{2}(?:～\d{2}:\d{2})?)\s+(.+)$/);
      items.push({
        time: timedLine?.[1] ?? null,
        label: timedLine?.[2] ?? line,
      });
    }
  }

  return items;
}

function sectionBetween(markdown: string, startMarker: string, endMarker: string): string {
  const start = markdown.indexOf(startMarker);

  if (start < 0) {
    throw new Error(`雨備行程缺少段落：${startMarker}`);
  }

  const end = markdown.indexOf(endMarker, start + startMarker.length);

  if (end < 0) {
    throw new Error(`雨備行程缺少段落結尾：${endMarker}`);
  }

  return markdown.slice(start, end).trim();
}

function createRainyDay(
  day: number,
  date: string,
  title: string,
  markdown: string,
): ItineraryDay {
  const tableItems = parseScheduleItems(markdown);

  return {
    day,
    date,
    title,
    items: tableItems.length > 0 ? tableItems : parseTextRouteItems(markdown),
    markdown,
  };
}

export function parseNormalItinerary(markdown: string): ItineraryDay[] {
  const headings = [...markdown.matchAll(dayHeadingPattern)];

  if (headings.length !== 4) {
    throw new Error("正常行程必須包含四個日期段落");
  }

  return headings.map((heading, index) => {
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(start, end).trim();
    const day = heading[1];
    const month = heading[2];
    const date = heading[3];
    const title = heading[4]?.trim();

    if (!day || !month || !date || !title) {
      throw new Error("行程日期標題格式不完整");
    }

    return {
      day: Number(day),
      date: toIsoDate(month, date),
      title,
      items: parseScheduleItems(section),
      markdown: section,
    };
  });
}

export function parseRainyItinerary(markdown: string): ItineraryDay[] {
  return [
    createRainyDay(
      1,
      "2026-07-31",
      "抵達日雨備",
      sectionBetween(markdown, "## Day 1｜", "\n---"),
    ),
    createRainyDay(
      2,
      "2026-08-01",
      "水族館＋SPA LAND",
      sectionBetween(markdown, "## Day 2｜8/01", "## Day 3｜8/02"),
    ),
    createRainyDay(
      3,
      "2026-08-02",
      "購物＋飯店放鬆",
      sectionBetween(markdown, "### 方案 C2：", "### 為什麼不改排"),
    ),
    createRainyDay(
      4,
      "2026-08-03",
      "室內購物＋回程",
      sectionBetween(markdown, "### 方案 2：", "### 回程硬規則"),
    ),
  ];
}
