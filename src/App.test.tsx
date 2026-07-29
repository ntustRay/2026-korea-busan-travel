import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("today itinerary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("switches the current day between sunny and rainy plans and remembers the choice", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    const firstView = render(<App now={now} />);

    expect(screen.getByRole("heading", { name: "X the SKY＋海雲台＋SPA LAND＋西面" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "切換為雨天行程" }));

    expect(screen.getByRole("heading", { name: "Luge＋Brick Campus＋Outlet" })).toBeVisible();

    firstView.unmount();
    render(<App now={now} />);

    expect(screen.getByRole("heading", { name: "Luge＋Brick Campus＋Outlet" })).toBeVisible();
  });

  it("keeps sunny and rainy progress separate", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getByRole("button", { name: "設為目前行程：BUSAN X the SKY；使用 BIG 5 A 組" }));
    expect(screen.getByText("目前", { selector: "span" }).closest("li")).toHaveTextContent(
      "BUSAN X the SKY",
    );

    await user.click(screen.getByRole("button", { name: "切換為雨天行程" }));
    expect(screen.queryByRole("button", { name: "恢復自動" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^設為目前行程：/ })[0]!);
    await user.click(screen.getByRole("button", { name: "切換為晴天行程" }));

    expect(screen.getByText("目前", { selector: "span" }).closest("li")).toHaveTextContent(
      "BUSAN X the SKY",
    );
  });

  it("suggests the next timed item using Korea local time", () => {
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    const nextRegion = screen.getByRole("region", { name: "現在／下一步" });
    expect(nextRegion).toHaveTextContent("10:30～12:00");
    expect(nextRegion).toHaveTextContent("BUSAN X the SKY");
  });

  it("shows only curated, short attention items", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getByRole("button", { name: "注意" }));
    expect(screen.getByRole("heading", { name: "韓國注意事項" })).toBeVisible();
    expect(screen.getByText("吃完飯請立即移動！")).toBeVisible();
    expect(screen.getByText("地鐵方向看終點站韓文")).toBeVisible();
    expect(screen.getByText("不要「嗯嗯」，要說「內內」！")).toBeVisible();
    expect(screen.getByRole("link", { name: "搭車" })).toHaveAttribute("href", "#attention-搭車");
    expect(screen.getByText("不要亂拍人").closest("li")).toHaveClass("red-line");
    expect(screen.queryByText("翻譯菜單、對話與韓文圖片")).not.toBeInTheDocument();
  });

  it("does not expose unorganized raw notes", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getByRole("button", { name: "注意" }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByText("韓國與釜山文化注意事項")).not.toBeInTheDocument();
    expect(screen.queryByText("交通注意事項")).not.toBeInTheDocument();
  });

  it("offers NAVER Map first and Uber as the primary taxi app for today's destination", () => {
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    expect(screen.getByRole("link", { name: "NAVER Map" })).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("부산 엑스 더 스카이")),
    );
    expect(screen.getByRole("link", { name: "Uber" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^uber:/),
    );
    expect(screen.getByRole("link", { name: "NAVER Map" })).toHaveClass(
      "primary-action",
    );
  });

  it("uses warm sunny styling and dark rainy styling", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    const { container } = render(<App now={now} />);

    expect(container.firstElementChild).toHaveAttribute("data-weather", "sunny");
    expect(document.documentElement).toHaveAttribute("data-weather", "sunny");

    await user.click(screen.getByRole("button", { name: "切換為雨天行程" }));

    expect(container.firstElementChild).toHaveAttribute("data-weather", "rainy");
    expect(document.documentElement).toHaveAttribute("data-weather", "rainy");
    expect(screen.getByText("目前使用雨天行程")).toBeVisible();
    expect(screen.queryByText(/[☀️🌧️]/)).not.toBeInTheDocument();
  });

  it("shows a recovery message when the k.ride address cannot be copied", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("Clipboard permission denied"),
    );

    await user.click(screen.getByRole("button", { name: "k.ride" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "無法複製，請長按上方韓文地址。",
    );
    writeText.mockRestore();
  });

  it("moves to the next item and can skip the current item", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getByRole("button", { name: "設為目前行程：BUSAN X the SKY；使用 BIG 5 A 組" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(screen.getByText("目前", { selector: "span" }).closest("li")).toHaveTextContent(
      "海雲台傳統市場午餐",
    );

    await user.click(screen.getByRole("button", { name: "略過" }));

    expect(screen.getByText("已略過").closest("li")).toHaveTextContent("海雲台傳統市場午餐");
    expect(screen.getByText("目前", { selector: "span" }).closest("li")).toHaveTextContent(
      "海雲台海灘、Gunam-ro 短逛",
    );
  });

  it("shows a countdown and preparation entry before the trip", () => {
    const now = new Date("2026-07-26T01:00:00.000Z");
    render(<App now={now} />);

    expect(screen.getByText("距離出發 5 天")).toBeVisible();
    expect(screen.getByRole("button", { name: "查看準備" })).toBeVisible();
  });

  it("shows separate sunny and rainy previews for every date", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-02T01:00:00.000Z");
    render(<App now={now} />);

    await user.click(screen.getByRole("button", { name: "行程" }));

    expect(screen.getByText("X the SKY＋海雲台＋SPA LAND＋西面")).toBeVisible();
    expect(screen.getByText("Luge＋Brick Campus＋Outlet")).toBeVisible();
  });

  it("separates weather information from the itinerary mode and enlarges the route map", async () => {
    const user = userEvent.setup();
    render(<App now={new Date("2026-08-02T01:00:00.000Z")} />);

    expect(screen.getByRole("region", { name: "釜山天氣" })).toHaveTextContent("釜山");
    expect(screen.getByRole("region", { name: "釜山天氣" })).toHaveTextContent("濕度");
    expect(screen.getByRole("region", { name: "釜山天氣" })).toHaveTextContent("紫外線");
    expect(screen.getByRole("button", { name: "切換為雨天行程" })).not.toBe(
      screen.getByRole("region", { name: "釜山天氣" }),
    );

    await user.click(screen.getByRole("button", { name: "放大今日交通路線圖" }));
    expect(screen.getByRole("dialog", { name: "放大的今日交通路線圖" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "關閉放大路線圖" }));
    expect(screen.queryByRole("dialog", { name: "放大的今日交通路線圖" })).not.toBeInTheDocument();
  });

  it("uses four primary navigation entries", async () => {
    const user = userEvent.setup();
    render(<App now={new Date("2026-08-02T01:00:00.000Z")} />);

    expect(screen.getByRole("navigation", { name: "主要導覽" }).querySelectorAll("button")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "更多" })).not.toBeInTheDocument();

  });

  it("keeps preparation and installed app checks in local storage", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-07-26T01:00:00.000Z");
    const firstView = render(<App now={now} />);

    await user.click(screen.getByRole("button", { name: "行前" }));
    await user.click(screen.getByRole("button", { name: "確認兩本護照效期與機票英文姓名" }));
    await user.click(screen.getByRole("button", { name: "標示已安裝：NAVER Map" }));
    expect(screen.getByText("1／14 項完成")).toBeVisible();
    expect(screen.getByText("1／7")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "開啟／安裝" })[0]).toHaveAttribute("href", expect.stringContaining("package=com.nhn.android.nmap"));

    firstView.unmount();
    render(<App now={now} />);
    await user.click(screen.getByRole("button", { name: "行前" }));
    expect(screen.getByRole("button", { name: "確認兩本護照效期與機票英文姓名" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "取消完成：NAVER Map" })).toHaveAttribute("aria-pressed", "true");
  });
});
