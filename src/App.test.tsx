import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("today itinerary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("switches the current day between sunny and rainy plans and remembers the choice", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    const firstView = render(<App now={now} />);

    expect(screen.getByRole("heading", { name: "水族館＋海雲台看海＋SPA" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "切換為雨天行程" }));

    expect(screen.getByRole("heading", { name: "購物＋飯店放鬆" })).toBeVisible();

    firstView.unmount();
    render(<App now={now} />);

    expect(screen.getByRole("heading", { name: "購物＋飯店放鬆" })).toBeVisible();
  });

  it("keeps sunny and rainy progress separate", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getAllByRole("button", { name: "設為目前行程" })[1]!);
    expect(screen.getByText("目前", { selector: "span" }).closest("li")).toHaveTextContent(
      "SEA LIFE Busan Aquarium",
    );

    await user.click(screen.getByRole("button", { name: "切換為雨天行程" }));
    expect(screen.queryByText("目前", { selector: "span" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "設為目前行程" })[0]!);
    await user.click(screen.getByRole("button", { name: "切換為晴天行程" }));

    expect(screen.getByText("目前", { selector: "span" }).closest("li")).toHaveTextContent(
      "SEA LIFE Busan Aquarium",
    );
  });

  it("suggests the next timed item using Korea local time", () => {
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    expect(screen.getByRole("region", { name: "下一步" })).toHaveTextContent(
      "10:30～12:30 SEA LIFE Busan Aquarium",
    );
  });

  it("opens the attention library and searches all notes", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getByRole("button", { name: "注意" }));
    expect(screen.getByRole("heading", { name: "注意事項" })).toBeVisible();

    await user.type(screen.getByRole("searchbox", { name: "搜尋旅行資料" }), "博愛座");

    expect(screen.getAllByRole("button", { name: /地鐵、公車與電扶梯/ })).not.toHaveLength(0);
  });

  it("offers NAVER Map first and Uber as the primary taxi app for today's destination", () => {
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    expect(screen.getByRole("link", { name: "用 NAVER Map 導航" })).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("씨라이프 부산 아쿠아리움")),
    );
    expect(screen.getByRole("link", { name: "用 Uber 叫車" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^uber:/),
    );
  });

  it("moves to the next item and can skip the current item", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getAllByRole("button", { name: "設為目前行程" })[1]!);
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(screen.getByText("目前", { selector: "span" }).closest("li")).toHaveTextContent(
      "海雲台午餐",
    );

    await user.click(screen.getByRole("button", { name: "略過目前行程" }));

    expect(screen.getByText("已略過").closest("li")).toHaveTextContent("海雲台午餐");
    expect(screen.getByText("目前", { selector: "span" }).closest("li")).toHaveTextContent(
      "海雲台海灘散步、看海",
    );
  });

  it("shows a countdown and preparation entry before the trip", () => {
    const now = new Date("2026-07-26T01:00:00.000Z");
    render(<App now={now} />);

    expect(screen.getByRole("heading", { name: "距離出發還有 5 天" })).toBeVisible();
    expect(screen.getByRole("button", { name: "查看出發前 Checklist" })).toBeVisible();
  });

  it("shows separate sunny and rainy previews for every date", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getByRole("button", { name: "行程" }));

    expect(screen.getByText("晴天 · 水族館＋海雲台看海＋SPA")).toBeVisible();
    expect(screen.getByText("雨天 · 購物＋飯店放鬆")).toBeVisible();
  });
});
