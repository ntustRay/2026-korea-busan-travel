import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import normalMarkdown from "../itinerary-normal.md?raw";
import rainyMarkdown from "../itinerary-rainy.md?raw";
import { parseNormalItinerary, parseRainyItinerary } from "./content/itinerary";
import { notes, searchNotes, type NoteCategory } from "./content/notes";
import { destinationFor, hotel, naverMapUrl, uberUrl } from "./content/places";

type WeatherMode = "sunny" | "rainy";
type AppTab = "today" | "itinerary" | "attention" | "more";

interface CurrentProgress {
  sunny: number | null;
  rainy: number | null;
}

interface SkippedProgress {
  sunny: number[];
  rainy: number[];
}

export interface AppProps {
  now: Date;
}

const normalDays = parseNormalItinerary(normalMarkdown);
const rainyDays = parseRainyItinerary(rainyMarkdown);

interface NoteLibraryProps {
  category: NoteCategory;
  title: string;
}

function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div className="markdown-article">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img({ src, alt }) {
            return <img src={src?.replace("./images/", "./")} alt={alt ?? ""} loading="lazy" />;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function NoteLibrary({ category, title }: NoteLibraryProps) {
  const [query, setQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNote = notes.find((note) => note.id === selectedNoteId);
  const results = searchNotes(notes, query);

  if (selectedNote) {
    return (
      <section>
        <button className="secondary-button" type="button" onClick={() => setSelectedNoteId(null)}>
          返回{title}
        </button>
        <MarkdownContent markdown={selectedNote.markdown} />
      </section>
    );
  }

  return (
    <section>
      <h1>{title}</h1>
      <label className="search-label">
        <span>搜尋旅行資料</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="搜尋旅行資料"
          placeholder="交通卡、博愛座、Uber…"
        />
      </label>
      {query ? (
        <ul className="note-list">
          {results.map((result, index) => (
            <li key={`${result.noteId}-${result.sectionTitle}-${index}`}>
              <button type="button" onClick={() => setSelectedNoteId(result.noteId)}>
                <strong>{result.sectionTitle}</strong>
                <span>{result.excerpt}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="note-list">
          {notes.filter((note) => note.category === category).map((note) => (
            <li key={note.id}>
              <button type="button" onClick={() => setSelectedNoteId(note.id)}>
                {note.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function dateInSeoul(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("無法判斷韓國當地日期");
  }

  return `${year}-${month}-${day}`;
}

function timeInSeoul(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return hour * 60 + minute;
}

function startMinutes(time: string | null): number | null {
  const match = time?.match(/^(\d{2}):(\d{2})/);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function readWeatherMode(date: string): WeatherMode {
  return window.localStorage.getItem(`busan-weather-${date}`) === "rainy"
    ? "rainy"
    : "sunny";
}

function readCurrentIndex(date: string, mode: WeatherMode): number | null {
  const stored = window.localStorage.getItem(`busan-current-${date}-${mode}`);

  if (stored === null) {
    return null;
  }

  const index = Number(stored);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function readSkipped(date: string, mode: WeatherMode): number[] {
  const stored = window.localStorage.getItem(`busan-skipped-${date}-${mode}`);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "number" && Number.isInteger(value))
      : [];
  } catch {
    return [];
  }
}

export function App({ now }: AppProps) {
  const [tab, setTab] = useState<AppTab>("today");
  const today = dateInSeoul(now);
  const firstDay = normalDays[0];
  const lastDay = normalDays[normalDays.length - 1];

  if (!firstDay || !lastDay) {
    throw new Error("找不到旅行日期");
  }

  const selectedDay = normalDays.find((day) => day.date === today)
    ?? (today < firstDay.date ? firstDay : lastDay);
  const isBeforeTrip = today < firstDay.date;
  const isAfterTrip = today > lastDay.date;
  const [showInstallHint, setShowInstallHint] = useState(() =>
    isBeforeTrip
      && window.localStorage.getItem("busan-install-hint") !== "dismissed"
      && !(typeof window.matchMedia === "function"
        && window.matchMedia("(display-mode: standalone)").matches),
  );
  const daysUntilTrip = Math.round(
    (Date.parse(`${firstDay.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`))
      / 86_400_000,
  );

  if (!selectedDay) {
    throw new Error("找不到旅行行程");
  }

  const [weatherMode, setWeatherMode] = useState<WeatherMode>(() =>
    readWeatherMode(selectedDay.date),
  );
  const [currentProgress, setCurrentProgress] = useState<CurrentProgress>(() => ({
    sunny: readCurrentIndex(selectedDay.date, "sunny"),
    rainy: readCurrentIndex(selectedDay.date, "rainy"),
  }));
  const [skippedProgress, setSkippedProgress] = useState<SkippedProgress>(() => ({
    sunny: readSkipped(selectedDay.date, "sunny"),
    rainy: readSkipped(selectedDay.date, "rainy"),
  }));
  const day = weatherMode === "sunny"
    ? selectedDay
    : rainyDays.find((rainyDay) => rainyDay.date === selectedDay.date) ?? selectedDay;
  const manualCurrent = currentProgress[weatherMode];
  const suggestedIndex = manualCurrent ?? day.items.findIndex((item) => {
    const minutes = startMinutes(item.time);
    return minutes !== null && minutes >= timeInSeoul(now);
  });
  const nextItem = day.items[suggestedIndex >= 0 ? suggestedIndex : day.items.length - 1];
  const destination = destinationFor(selectedDay.date, weatherMode);

  function toggleWeather() {
    const nextMode = weatherMode === "sunny" ? "rainy" : "sunny";
    window.localStorage.setItem(`busan-weather-${selectedDay.date}`, nextMode);
    setWeatherMode(nextMode);
  }

  function setCurrent(index: number) {
    window.localStorage.setItem(
      `busan-current-${selectedDay.date}-${weatherMode}`,
      String(index),
    );
    setCurrentProgress((current) => ({ ...current, [weatherMode]: index }));
  }

  function advance(skipCurrent: boolean) {
    const currentIndex = currentProgress[weatherMode] ?? suggestedIndex;

    if (currentIndex < 0) {
      return;
    }

    if (skipCurrent) {
      const nextSkipped = [...new Set([...skippedProgress[weatherMode], currentIndex])];
      window.localStorage.setItem(
        `busan-skipped-${selectedDay.date}-${weatherMode}`,
        JSON.stringify(nextSkipped),
      );
      setSkippedProgress((current) => ({ ...current, [weatherMode]: nextSkipped }));
    }

    setCurrent(Math.min(currentIndex + 1, day.items.length - 1));
  }

  function resetToday() {
    for (const mode of ["sunny", "rainy"] satisfies WeatherMode[]) {
      window.localStorage.removeItem(`busan-current-${selectedDay.date}-${mode}`);
      window.localStorage.removeItem(`busan-skipped-${selectedDay.date}-${mode}`);
    }
    setCurrentProgress({ sunny: null, rainy: null });
    setSkippedProgress({ sunny: [], rainy: [] });
  }

  function dismissInstallHint() {
    window.localStorage.setItem("busan-install-hint", "dismissed");
    setShowInstallHint(false);
  }

  async function openKride() {
    await navigator.clipboard?.writeText(`${destination.koreanName}\n${destination.address}`);
    window.location.href = "intent://#Intent;package=com.kakaomobility.kride;end";
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        {tab === "today" ? (
          <section>
            <header className="page-header">
              <p className="eyebrow">釜山 2026</p>
              <button
                className="weather-toggle"
                data-mode={weatherMode}
                type="button"
                onClick={toggleWeather}
                aria-label={weatherMode === "sunny" ? "切換為雨天行程" : "切換為晴天行程"}
              >
                <span aria-hidden="true">{weatherMode === "sunny" ? "☀️ 正常" : "🌧️ 雨備"}</span>
              </button>
            </header>
            {isBeforeTrip ? (
              <section className="countdown-card">
                <h2>距離出發還有 {daysUntilTrip} 天</h2>
                <p>先完成必要設定，再預覽第一天抵達流程。</p>
                <button className="secondary-button" type="button" onClick={() => setTab("attention")}>
                  查看出發前 Checklist
                </button>
              </section>
            ) : null}
            {showInstallHint ? (
              <section className="info-card">
                <h2>加到手機主畫面</h2>
                <p>在 Chrome 選單中點選「安裝應用程式」或「加到主畫面」，旅途中可離線開啟。</p>
                <button className="secondary-button" type="button" onClick={dismissInstallHint}>
                  知道了
                </button>
              </section>
            ) : null}
            {isAfterTrip ? (
              <section>
                <h2>旅行已結束</h2>
                <button type="button" onClick={() => setTab("itinerary")}>查看完整行程</button>
              </section>
            ) : null}
            <h1>{day.title}</h1>
            {nextItem ? (
              <section className="next-card" aria-labelledby="next-step-heading">
                <h2 id="next-step-heading">下一步</h2>
                <p className="next-label">
                  {nextItem.time ? `${nextItem.time} ` : ""}
                  {nextItem.label}
                </p>
                <p className="korean-address">{destination.koreanName}</p>
                <div className="action-grid">
                  <a className="action-link" href={naverMapUrl(destination)}>用 NAVER Map 導航</a>
                  <a className="action-link" href={uberUrl(destination)}>用 Uber 叫車</a>
                  <button type="button" onClick={openKride}>複製地址並開啟 k.ride</button>
                  <a className="action-link" href={naverMapUrl(hotel)}>回飯店</a>
                </div>
                {manualCurrent !== null ? (
                  <div className="progress-actions">
                    <button type="button" onClick={() => advance(false)}>下一步</button>
                    <button type="button" onClick={() => advance(true)}>略過目前行程</button>
                  </div>
                ) : null}
              </section>
            ) : null}
            <ol className="timeline">
              {day.items.map((item, index) => (
                <li
                  key={`${day.date}-${weatherMode}-${index}`}
                  data-current={currentProgress[weatherMode] === index}
                >
                  <div>
                    {currentProgress[weatherMode] === index ? <span className="status-badge">目前</span> : null}
                    {skippedProgress[weatherMode].includes(index) ? <span className="status-badge skipped">已略過</span> : null}
                  </div>
                  {item.time ? <time>{item.time}</time> : null} {item.label}
                  <button type="button" onClick={() => setCurrent(index)}>
                    設為目前行程
                  </button>
                </li>
              ))}
            </ol>
            <button className="secondary-button" type="button" onClick={resetToday}>重設今日進度</button>
          </section>
        ) : null}
        {tab === "itinerary" ? (
          <section>
            <h1>完整行程</h1>
            {normalDays.map((itineraryDay) => {
              const rainyDay = rainyDays.find((candidate) => candidate.date === itineraryDay.date);

              return (
                <article className="day-card" key={itineraryDay.date}>
                  <h2>{itineraryDay.date}</h2>
                  <details>
                    <summary>晴天 · {itineraryDay.title}</summary>
                    <MarkdownContent markdown={itineraryDay.markdown} />
                  </details>
                  {rainyDay ? (
                    <details>
                      <summary>雨天 · {rainyDay.title}</summary>
                      <MarkdownContent markdown={rainyDay.markdown} />
                    </details>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}
        {tab === "attention" ? <NoteLibrary category="attention" title="注意事項" /> : null}
        {tab === "more" ? (
          <>
            <NoteLibrary category="more" title="更多資料" />
            <section className="info-card">
              <h2>網站資訊</h2>
              <p>版本：{(import.meta.env.VITE_GIT_COMMIT || "local").slice(0, 7)}</p>
              <p>
                最後建置：
                {new Date(__BUILD_TIME__).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
              </p>
              <p>交通、營業時間與票券規則可能變動，出發前請再確認官方資料。</p>
            </section>
          </>
        ) : null}
      </main>
      <nav className="bottom-nav" aria-label="主要導覽">
        <button type="button" aria-current={tab === "today" ? "page" : undefined} onClick={() => setTab("today")}><span className="nav-icon" aria-hidden="true">◉</span>今天</button>
        <button type="button" aria-current={tab === "itinerary" ? "page" : undefined} onClick={() => setTab("itinerary")}><span className="nav-icon" aria-hidden="true">▤</span>行程</button>
        <button type="button" aria-current={tab === "attention" ? "page" : undefined} onClick={() => setTab("attention")}><span className="nav-icon" aria-hidden="true">!</span>注意</button>
        <button type="button" aria-current={tab === "more" ? "page" : undefined} onClick={() => setTab("more")}><span className="nav-icon" aria-hidden="true">•••</span>更多</button>
      </nav>
    </div>
  );
}
