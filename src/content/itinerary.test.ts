import { describe, expect, it } from "vitest";
import normalMarkdown from "../../notes/itinerary/itinerary-normal.md?raw";
import rainyMarkdown from "../../notes/itinerary/itinerary-rainy.md?raw";
import { parseNormalItinerary, parseRainyItinerary } from "./itinerary";

describe("normal itinerary content", () => {
  it("turns the four dated Markdown day sections into ordered schedule data", () => {
    const days = parseNormalItinerary(normalMarkdown);

    expect(days).toHaveLength(4);
    expect(days[0]).toMatchObject({
      day: 1,
      date: "2026-07-31",
      title: "抵達釜山",
    });
    expect(days[0]?.items[0]).toEqual({
      time: "18:00",
      label: "BR164 抵達 PUS",
    });
    expect(days[3]).toMatchObject({
      day: 4,
      date: "2026-08-03",
      title: "松島纜車＋BIFF＋Lotte Mart＋機場",
    });
  });

  it("rejects Markdown that does not contain all four dated day sections", () => {
    expect(() => parseNormalItinerary("# 不完整行程")).toThrow(
      "正常行程必須包含四個日期段落",
    );
  });
});

describe("rainy itinerary content", () => {
  it("provides one rainy-day plan for every trip date", () => {
    const days = parseRainyItinerary(rainyMarkdown);

    expect(days.map((day) => day.date)).toEqual([
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
    expect(days[2]).toMatchObject({
      title: "Luge＋Brick Campus＋Outlet",
    });
    expect(days[2]?.items).toContainEqual({
      time: "10:00～12:00",
      label: "Skyline Luge；以官方顯示營運中為前提",
    });
  });
});
