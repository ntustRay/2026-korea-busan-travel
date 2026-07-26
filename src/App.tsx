import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  ChevronDown,
  CloudRain,
  CloudSun,
  Copy,
  Droplets,
  ExternalLink,
  Info,
  ListChecks,
  Map,
  MapPin,
  Maximize2,
  Navigation,
  RotateCcw,
  Sun,
  TrainFront,
  Umbrella,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import normalMarkdown from "../itinerary-normal.md?raw";
import rainyMarkdown from "../itinerary-rainy.md?raw";
import { parseNormalItinerary, parseRainyItinerary } from "./content/itinerary";
import { destinationFor, hotel, naverMapUrl, uberUrl } from "./content/places";

type WeatherMode = "sunny" | "rainy";
type AppTab = "today" | "itinerary" | "attention" | "preparation";
type KrideStatus = "idle" | "copied" | "error";

interface CurrentProgress {
  sunny: number | null;
  rainy: number | null;
}

interface SkippedProgress {
  sunny: number[];
  rainy: number[];
}

interface WeatherForecast {
  currentTemperature: number;
  currentHumidity: number;
  codes: [number, number];
  maximums: [number, number];
  minimums: [number, number];
  uvIndexes: [number, number];
  updatedAt: string;
}

export interface AppProps {
  now: Date;
}

interface IconLabelProps {
  icon: ReactNode;
  children: ReactNode;
}

const normalDays = parseNormalItinerary(normalMarkdown);
const rainyDays = parseRainyItinerary(rainyMarkdown);
const routeImages: Record<string, string> = {
  "2026-07-31": "./transport/01-airport-hotel.svg",
  "2026-08-01": "./transport/03-osiria-area.svg",
  "2026-08-02": "./transport/04-haeundae-aquarium.svg",
  "2026-08-03": "./transport/06-songdo-route.svg",
};
const dailyReminders: Record<string, string> = {
  "2026-07-31": "抵達後先完成交通卡與網路設定。",
  "2026-08-01": "熱門設施先確認預約時間。",
  "2026-08-02": "不要亂拍人，也不要用手指指人。",
  "2026-08-03": "回程前再次確認護照與行李。",
};
const koreaAttentionGroups = [
  {
    title: "餐廳",
    items: [
      "吃完飯請立即移動！",
      "飲料不用自己拿",
      "先找 Self-service 標示",
      "不用給小費",
      "按桌上呼叫鈴找店員",
      "不要把筷子插在飯上",
      "金屬飯碗不要端起來",
      "店員烤肉時不要搶著翻",
      "生肉夾不要碰熟食",
    ],
  },
  {
    title: "搭車",
    items: [
      "排隊並先下後上",
      "地鐵博愛座潛規則",
      "孕婦座位保持空位",
      "手機不要開擴音",
      "行李不要擋門或走道",
      "公車下車前按鈴再刷卡",
      "未密封飲料不要帶上公車",
      "地鐵方向看終點站韓文",
      "交通卡不要兩人共用",
      "迷路先貼韓文到 NAVER Map",
    ],
  },
  {
    title: "互動與拍照",
    items: [
      "不要「嗯嗯」，要說「內內」！",
      "不要用手指指人",
      "不要亂拍人",
      "拍人前先詢問",
      "被拒絕就收起手機",
      "付款與拿東西盡量用雙手",
      "聽不懂就用 Papago",
      "不要提高音量重複說",
      "手機佔位子",
    ],
  },
  {
    title: "市場與 SPA",
    items: [
      "點海鮮前先問最終總價",
      "先問料理費與座位費",
      "信用卡不用撿",
      "先洗澡再進浴池",
      "浴場不要帶手機拍照",
      "毛巾不要泡進浴池",
      "長頭髮先綁起來",
      "不舒服就離開高溫房",
      "進場先確認離場時間",
    ],
  },
];
const redLineItems = new Set([
  "孕婦座位保持空位",
  "行李不要擋門或走道",
  "不要用手指指人",
  "不要亂拍人",
  "被拒絕就收起手機",
  "浴場不要帶手機拍照",
  "行動電源只能放隨身行李",
  "行動電源不要放頭頂置物櫃",
  "飛行中不要使用行動電源",
  "e-Arrival Card 只用官方免費網站",
]);
const travelApps = [
  { name: "NAVER Map", purpose: "地鐵、公車與步行導航", packageName: "com.nhn.android.nmap", priority: "必裝" },
  { name: "Papago", purpose: "翻譯菜單、對話與韓文圖片", packageName: "com.naver.labs.translator", priority: "必裝" },
  { name: "k.ride", purpose: "外國旅客短程叫車", packageName: "com.kakaomobility.kride", priority: "必裝" },
  { name: "Visit Busan Pass", purpose: "Mobile 版開 QR；實體卡只查紀錄", packageName: "com.busan.visitbusanpass", priority: "視票種" },
  { name: "EVA Mobile", purpose: "航班通知、報到與登機證", packageName: "com.evaair.android", priority: "必裝" },
  { name: "KMA Weather", purpose: "接收韓國官方豪雨與強風警報", packageName: "kr.go.kma.weatherapp", priority: "選配" },
  { name: "Emergency Ready", purpose: "尋找急診、警察局與避難所", packageName: "kr.or.klid.newengsafekorea2025", priority: "選配" },
];
const preparationItems = [
  { id: "passport", label: "確認兩本護照效期與機票英文姓名" },
  { id: "esim", label: "安裝兩張 eSIM 並保存 QR Code" },
  { id: "adapter", label: "帶 Type C／F 轉接頭" },
  { id: "offline-files", label: "兩支手機都保存護照與訂房截圖" },
  { id: "arrival-card", label: "7/28 起填寫官方 e-Arrival Card" },
  { id: "weather", label: "確認釜山天氣與纜車營運" },
  { id: "power", label: "手機與行動電源充滿電" },
  { id: "power-pack", label: "行動電源放隨身行李並防短路" },
  { id: "liquids", label: "隨身液體每瓶不超過 100ml" },
  { id: "medicine", label: "常備藥保留原包裝與成分標示" },
  { id: "rain", label: "帶折疊傘與防滑鞋" },
  { id: "cash", label: "準備韓元現金與可海外交易信用卡" },
  { id: "pass", label: "確認 BIG 5 票型與 2A＋3B 名單後再購買" },
  { id: "luggage", label: "回程托運每人不超過 20kg" },
];

function androidAppUrl(packageName: string): string {
  const playUrl = encodeURIComponent(`https://play.google.com/store/apps/details?id=${packageName}`);
  return `intent://#Intent;package=${packageName};S.browser_fallback_url=${playUrl};end`;
}

interface StoredPreparationProgress {
  version: 1;
  completed: string[];
}

function isStoredPreparationProgress(value: unknown): value is StoredPreparationProgress {
  if (typeof value !== "object" || value === null) return false;
  const record = Object.fromEntries(Object.entries(value));
  return record.version === 1
    && Array.isArray(record.completed)
    && record.completed.every((item) => typeof item === "string");
}

function readPreparationProgress(): string[] {
  const stored = window.localStorage.getItem("busan-preparation-progress");
  if (!stored) return [];
  try {
    const value: unknown = JSON.parse(stored);
    if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
    return isStoredPreparationProgress(value) ? value.completed : [];
  } catch {
    return [];
  }
}

function IconLabel({ icon, children }: IconLabelProps) {
  return <span className="icon-label">{icon}{children}</span>;
}

function MarkdownContent({ markdown }: { markdown: string }) {
  const displayMarkdown = markdown.replace(/\p{Extended_Pictographic}|\uFE0F/gu, "");

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
        {displayMarkdown}
      </ReactMarkdown>
    </div>
  );
}

function AttentionList() {
  return (
    <section>
      <header className="section-heading">
        <p className="station-code">NOTICE</p>
        <h1>韓國注意事項</h1>
        <p>看到就照做。</p>
      </header>
      <nav className="attention-toc" aria-label="注意事項目錄">
        {koreaAttentionGroups.map((group) => <a key={group.title} href={`#attention-${group.title}`}>{group.title}</a>)}
      </nav>
      <div className="attention-groups">
        {koreaAttentionGroups.map((group) => (
          <section className="attention-group" id={`attention-${group.title}`} key={group.title}>
            <h2>{group.title}</h2>
            <ol className="attention-list">
              {group.items.map((item) => <li className={redLineItems.has(item) ? "red-line" : undefined} key={item}><strong>{item}</strong></li>)}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}

function PreparationPage({ completed, onToggle }: { completed: string[]; onToggle: (id: string) => void }) {
  const completedCount = preparationItems.filter((item) => completed.includes(item.id)).length;
  const installedCount = travelApps.filter((app) => completed.includes(`app-${app.packageName}`)).length;

  return (
    <section>
      <header className="section-heading">
        <p className="station-code">BEFORE DEPARTURE</p>
        <h1>行前準備</h1>
        <p>{completedCount}／{preparationItems.length} 項完成</p>
      </header>
      <section className="preparation-section">
        <h2>Checklist</h2>
        <ul className="checklist">
          {preparationItems.map((item) => {
            const isCompleted = completed.includes(item.id);
            return <li key={item.id}><button type="button" aria-pressed={isCompleted} onClick={() => onToggle(item.id)}><span className="check-box">{isCompleted ? <Check aria-hidden="true" /> : null}</span><strong>{item.label}</strong></button></li>;
          })}
        </ul>
      </section>
      <section className="preparation-section" id="preparation-apps">
        <h2>必裝 App <span className="section-progress">{installedCount}／{travelApps.length}</span></h2>
        <div className="app-list">
          {travelApps.map((app) => {
            const id = `app-${app.packageName}`;
            const isCompleted = completed.includes(id);
            return (
              <article key={app.name}>
                <button className="app-check" type="button" aria-pressed={isCompleted} onClick={() => onToggle(id)} aria-label={`${isCompleted ? "取消完成" : "標示已安裝"}：${app.name}`}><span className="check-box">{isCompleted ? <Check aria-hidden="true" /> : null}</span></button>
                <div><strong>{app.name}</strong><p>{app.purpose}</p></div>
                <a href={androidAppUrl(app.packageName)}><ExternalLink aria-hidden="true" />開啟／安裝</a>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function datePartsInSeoul(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const hour = value("hour");
  const minute = value("minute");

  if (!year || !month || !day || !hour || !minute) {
    throw new Error("無法判斷韓國當地時間");
  }

  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function formatSeoulDate(now: Date): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(now);
}

function startMinutes(time: string | null): number | null {
  const match = time?.match(/^(\d{2}):(\d{2})/);
  return match?.[1] && match[2] ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function readWeatherMode(date: string): WeatherMode {
  return window.localStorage.getItem(`busan-weather-${date}`) === "rainy" ? "rainy" : "sunny";
}

function readCurrentIndex(date: string, mode: WeatherMode): number | null {
  const stored = window.localStorage.getItem(`busan-current-${date}-${mode}`);
  if (stored === null) return null;
  const index = Number(stored);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function readSkipped(date: string, mode: WeatherMode): number[] {
  const stored = window.localStorage.getItem(`busan-skipped-${date}-${mode}`);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "number" && Number.isInteger(value))
      : [];
  } catch {
    return [];
  }
}

function isNumberPair(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === "number"
    && typeof value[1] === "number";
}

function parseWeatherForecast(value: unknown): WeatherForecast | null {
  if (typeof value !== "object" || value === null) return null;
  const record = Object.fromEntries(Object.entries(value));
  const current = typeof record.current === "object" && record.current !== null
    ? Object.fromEntries(Object.entries(record.current))
    : null;
  const daily = typeof record.daily === "object" && record.daily !== null
    ? Object.fromEntries(Object.entries(record.daily))
    : null;

  if (!current || !daily || typeof current.temperature_2m !== "number") return null;
  if (typeof current.relative_humidity_2m !== "number") return null;
  if (!isNumberPair(daily.weather_code)
    || !isNumberPair(daily.temperature_2m_max)
    || !isNumberPair(daily.temperature_2m_min)
    || !isNumberPair(daily.uv_index_max)) return null;

  return {
    currentTemperature: current.temperature_2m,
    currentHumidity: current.relative_humidity_2m,
    codes: daily.weather_code,
    maximums: daily.temperature_2m_max,
    minimums: daily.temperature_2m_min,
    uvIndexes: daily.uv_index_max,
    updatedAt: new Date().toISOString(),
  };
}

function readCachedForecast(): WeatherForecast | null {
  const cached = window.localStorage.getItem("busan-weather-forecast");
  if (!cached) return null;
  try {
    const value: unknown = JSON.parse(cached);
    if (typeof value !== "object" || value === null) return null;
    const record = Object.fromEntries(Object.entries(value));
    if (typeof record.currentTemperature !== "number"
      || typeof record.currentHumidity !== "number"
      || !isNumberPair(record.codes)
      || !isNumberPair(record.maximums)
      || !isNumberPair(record.minimums)
      || !isNumberPair(record.uvIndexes)
      || typeof record.updatedAt !== "string") return null;
    return {
      currentTemperature: record.currentTemperature,
      currentHumidity: record.currentHumidity,
      codes: record.codes,
      maximums: record.maximums,
      minimums: record.minimums,
      uvIndexes: record.uvIndexes,
      updatedAt: record.updatedAt,
    };
  } catch {
    return null;
  }
}

function weatherLabel(code: number): string {
  if (code === 0) return "晴";
  if (code <= 3) return "多雲";
  if (code >= 51 && code <= 82) return "有雨";
  if (code >= 95) return "雷雨";
  return "陰天";
}

function WeatherIcon({ code }: { code: number }) {
  return code >= 51 ? <CloudRain aria-hidden="true" /> : code === 0 ? <Sun aria-hidden="true" /> : <CloudSun aria-hidden="true" />;
}

export function App({ now }: AppProps) {
  const [tab, setTab] = useState<AppTab>("today");
  const seoul = datePartsInSeoul(now);
  const firstDay = normalDays[0];
  const lastDay = normalDays[normalDays.length - 1];
  if (!firstDay || !lastDay) throw new Error("找不到旅行日期");

  const selectedDay = normalDays.find((day) => day.date === seoul.date)
    ?? (seoul.date < firstDay.date ? firstDay : lastDay);
  if (!selectedDay) throw new Error("找不到旅行行程");

  const isBeforeTrip = seoul.date < firstDay.date;
  const isAfterTrip = seoul.date > lastDay.date;
  const daysUntilTrip = Math.round(
    (Date.parse(`${firstDay.date}T00:00:00Z`) - Date.parse(`${seoul.date}T00:00:00Z`)) / 86_400_000,
  );
  const [weatherMode, setWeatherMode] = useState<WeatherMode>(() => readWeatherMode(selectedDay.date));
  const [currentProgress, setCurrentProgress] = useState<CurrentProgress>(() => ({
    sunny: readCurrentIndex(selectedDay.date, "sunny"),
    rainy: readCurrentIndex(selectedDay.date, "rainy"),
  }));
  const [skippedProgress, setSkippedProgress] = useState<SkippedProgress>(() => ({
    sunny: readSkipped(selectedDay.date, "sunny"),
    rainy: readSkipped(selectedDay.date, "rainy"),
  }));
  const [krideStatus, setKrideStatus] = useState<KrideStatus>("idle");
  const [forecast, setForecast] = useState<WeatherForecast | null>(() => readCachedForecast());
  const [weatherRefreshKey, setWeatherRefreshKey] = useState(0);
  const [weatherIsStale, setWeatherIsStale] = useState(false);
  const [routeImageExpanded, setRouteImageExpanded] = useState(false);
  const routeOpenButtonRef = useRef<HTMLButtonElement>(null);
  const routeCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [preparationProgress, setPreparationProgress] = useState<string[]>(() => readPreparationProgress());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const day = weatherMode === "sunny"
    ? selectedDay
    : rainyDays.find((rainyDay) => rainyDay.date === selectedDay.date) ?? selectedDay;
  const currentMinutes = Number(seoul.time.slice(0, 2)) * 60 + Number(seoul.time.slice(3));
  const automaticIndex = day.items.findIndex((item) => {
    const minutes = startMinutes(item.time);
    return minutes !== null && minutes >= currentMinutes;
  });
  const manualCurrent = currentProgress[weatherMode];
  const activeIndex = manualCurrent ?? (automaticIndex >= 0 ? automaticIndex : day.items.length - 1);
  const nextItem = day.items[activeIndex];
  const destination = destinationFor(selectedDay.date, weatherMode);

  function toggleWeather() {
    const nextMode = weatherMode === "sunny" ? "rainy" : "sunny";
    window.localStorage.setItem(`busan-weather-${selectedDay.date}`, nextMode);
    setKrideStatus("idle");
    setWeatherMode(nextMode);
  }

  function setCurrent(index: number) {
    window.localStorage.setItem(`busan-current-${selectedDay.date}-${weatherMode}`, String(index));
    setCurrentProgress((current) => ({ ...current, [weatherMode]: index }));
  }

  function restoreAutomatic() {
    window.localStorage.removeItem(`busan-current-${selectedDay.date}-${weatherMode}`);
    setCurrentProgress((current) => ({ ...current, [weatherMode]: null }));
  }

  function advance(skipCurrent: boolean) {
    if (activeIndex < 0) return;
    if (skipCurrent) {
      const nextSkipped = [...new Set([...skippedProgress[weatherMode], activeIndex])];
      window.localStorage.setItem(`busan-skipped-${selectedDay.date}-${weatherMode}`, JSON.stringify(nextSkipped));
      setSkippedProgress((current) => ({ ...current, [weatherMode]: nextSkipped }));
    }
    setCurrent(Math.min(activeIndex + 1, day.items.length - 1));
  }

  function resetToday() {
    for (const mode of ["sunny", "rainy"] satisfies WeatherMode[]) {
      window.localStorage.removeItem(`busan-current-${selectedDay.date}-${mode}`);
      window.localStorage.removeItem(`busan-skipped-${selectedDay.date}-${mode}`);
    }
    setCurrentProgress({ sunny: null, rainy: null });
    setSkippedProgress({ sunny: [], rainy: [] });
  }

  function togglePreparation(id: string) {
    setPreparationProgress((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      const stored: StoredPreparationProgress = { version: 1, completed: next };
      window.localStorage.setItem("busan-preparation-progress", JSON.stringify(stored));
      return next;
    });
  }

  async function openKride() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(`${destination.koreanName}\n${destination.address}`);
      setKrideStatus("copied");
      window.location.href = "intent://#Intent;package=com.kakaomobility.kride;end";
    } catch {
      setKrideStatus("error");
    }
  }

  useEffect(() => {
    const root = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    root.dataset.weather = weatherMode;
    themeColor?.setAttribute("content", weatherMode === "sunny" ? "#f7f4ec" : "#091a29");
  }, [weatherMode]);

  useEffect(() => {
    const controller = new AbortController();
    const url = "https://api.open-meteo.com/v1/forecast?latitude=35.1796&longitude=129.0756&current=temperature_2m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=Asia%2FSeoul&forecast_days=2";

    async function refreshForecast() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Weather response failed");
        const value: unknown = await response.json();
        const parsed = parseWeatherForecast(value);
        if (!parsed) throw new Error("Weather response invalid");
        window.localStorage.setItem("busan-weather-forecast", JSON.stringify(parsed));
        setForecast(parsed);
        setWeatherIsStale(false);
      } catch {
        // Offline mode intentionally keeps the last successfully cached forecast.
        setWeatherIsStale(true);
      }
    }

    void refreshForecast();
    return () => controller.abort();
  }, [weatherRefreshKey]);

  useEffect(() => {
    if (!routeImageExpanded) return undefined;
    routeCloseButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setRouteImageExpanded(false);
        routeOpenButtonRef.current?.focus();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        routeCloseButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [routeImageExpanded]);

  useEffect(() => {
    function showUpdate() {
      setUpdateAvailable(true);
    }
    window.addEventListener("busan-update-available", showUpdate);
    return () => window.removeEventListener("busan-update-available", showUpdate);
  }, []);

  return (
    <div className="app-shell" data-weather={weatherMode}>
      <main className="app-main">
        {updateAvailable ? <aside className="update-notice" role="status"><span><strong>新版行程已準備好</strong>更新不會清除勾選進度。</span><button type="button" onClick={() => window.dispatchEvent(new Event("busan-apply-update"))}>立即更新</button></aside> : null}
        {tab === "today" ? (
          <section>
            <header className="route-header">
              <div>
                <p className="station-code">BUSAN · KST</p>
                <p className="seoul-clock"><strong>{formatSeoulDate(now)}</strong><span>{seoul.time} 韓國時間</span></p>
              </div>
              <span className="route-number">{String(selectedDay.day).padStart(2, "0")}</span>
            </header>

            <section className="weather-panel" aria-label="釜山天氣">
              <header><MapPin aria-hidden="true" /><strong>釜山</strong><span>即時天氣</span></header>
              <div className="weather-days">
                <div>
                <IconLabel icon={forecast ? <WeatherIcon code={forecast.codes[0]} /> : weatherMode === "sunny" ? <Sun aria-hidden="true" /> : <CloudRain aria-hidden="true" />}>
                  <strong>今天</strong>{forecast ? `${weatherLabel(forecast.codes[0])} ${Math.round(forecast.currentTemperature)}° · ${Math.round(forecast.minimums[0])}–${Math.round(forecast.maximums[0])}°` : "等待更新"}
                </IconLabel>
                </div>
                <div>
                <IconLabel icon={forecast ? <WeatherIcon code={forecast.codes[1]} /> : <CloudSun aria-hidden="true" />}>
                  <strong>明天</strong>{forecast ? `${weatherLabel(forecast.codes[1])} ${Math.round(forecast.minimums[1])}–${Math.round(forecast.maximums[1])}°` : "等待更新"}
                </IconLabel>
                </div>
              </div>
              <div className="weather-metrics">
                <span><Droplets aria-hidden="true" />濕度 <strong>{forecast ? `${Math.round(forecast.currentHumidity)}%` : "--"}</strong></span>
                <span><Sun aria-hidden="true" />紫外線 <strong>{forecast ? forecast.uvIndexes[0].toFixed(1) : "--"}</strong></span>
              </div>
              <footer className="weather-footer">
                <span>{forecast ? `${weatherIsStale ? "離線資料 · " : ""}更新 ${new Date(forecast.updatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" })}` : "尚無天氣資料"}</span>
                <button type="button" onClick={() => setWeatherRefreshKey((current) => current + 1)}><RotateCcw aria-hidden="true" />重新整理</button>
              </footer>
            </section>

            <button className="itinerary-mode-button" data-mode={weatherMode} type="button" onClick={toggleWeather} aria-label={weatherMode === "sunny" ? "切換為雨天行程" : "切換為晴天行程"}>
              {weatherMode === "sunny" ? <Sun aria-hidden="true" /> : <Umbrella aria-hidden="true" />}
              <span><strong>目前使用{weatherMode === "sunny" ? "晴天" : "雨天"}行程</strong><small>點擊切換為{weatherMode === "sunny" ? "雨天" : "晴天"}</small></span>
            </button>

            {isBeforeTrip ? (
              <aside className="departure-note">
                <CalendarDays aria-hidden="true" />
                <div><strong>距離出發 {daysUntilTrip} 天</strong><span>先確認 App、網路與交通卡。</span></div>
                <button type="button" onClick={() => setTab("preparation")}>查看準備</button>
              </aside>
            ) : null}

            {isAfterTrip ? <p className="empty-state">旅行已結束，完整紀錄仍可離線查看。</p> : null}

            {nextItem ? (
              <section className="next-panel" aria-labelledby="next-step-heading">
                <div className="next-kicker"><span>NOW</span><span className="route-line" /><span>NEXT</span></div>
                <div className="next-heading">
                  <div>
                    <p id="next-step-heading">現在／下一步</p>
                    <h1>{nextItem.label}</h1>
                  </div>
                  {nextItem.time ? <time>{nextItem.time}</time> : null}
                </div>
                <div className="destination-meta">
                  <MapPin aria-hidden="true" />
                  <p><strong>{destination.koreanName}</strong><span>{destination.address}</span></p>
                </div>
                <p className="critical-note"><Info aria-hidden="true" /><strong>{dailyReminders[selectedDay.date]}</strong></p>
                <div className="travel-actions">
                  <a className="primary-action" href={naverMapUrl(destination)}><Navigation aria-hidden="true" />NAVER Map</a>
                  <a href={uberUrl(destination)}><ExternalLink aria-hidden="true" />Uber</a>
                  <button type="button" onClick={openKride}><Copy aria-hidden="true" />k.ride</button>
                </div>
                {destination.address !== hotel.address ? <a className="hotel-link" href={naverMapUrl(hotel)}><MapPin aria-hidden="true" />返回飯店</a> : null}
                {krideStatus === "copied" ? <p className="action-status" role="status"><Check aria-hidden="true" />地址已複製，請貼到 k.ride。</p> : null}
                {krideStatus === "error" ? <p className="action-status error" role="alert">無法複製，請長按上方韓文地址。</p> : null}
                <div className="progress-actions">
                  <button type="button" onClick={() => advance(false)}>下一步</button>
                  <button type="button" onClick={() => advance(true)}>略過</button>
                </div>
              </section>
            ) : null}

            <figure className="route-figure">
              <button ref={routeOpenButtonRef} type="button" onClick={() => setRouteImageExpanded(true)} aria-label="放大今日交通路線圖">
                <img src={routeImages[selectedDay.date]} alt={`${selectedDay.title}交通路線圖`} />
                <span><Maximize2 aria-hidden="true" />點擊放大</span>
              </button>
              <figcaption><TrainFront aria-hidden="true" />今日交通路線</figcaption>
            </figure>

            <section className="timeline-section">
              <div className="section-heading compact">
                <p className="station-code">TODAY ROUTE</p>
                <h2>{day.title}</h2>
                {manualCurrent !== null ? <button className="text-button" type="button" onClick={restoreAutomatic}><RotateCcw aria-hidden="true" />恢復自動</button> : <span className="auto-status">依韓國時間自動判斷</span>}
              </div>
              <ol className="timeline">
                {day.items.map((item, index) => {
                  const isCurrent = activeIndex === index;
                  const isSkipped = skippedProgress[weatherMode].includes(index);
                  return (
                    <li key={`${day.date}-${weatherMode}-${index}`} data-current={isCurrent} data-skipped={isSkipped}>
                      <button type="button" onClick={() => setCurrent(index)} aria-label={`設為目前行程：${item.label}`}>
                        <span className="timeline-marker">{isCurrent ? <Navigation aria-hidden="true" /> : <span />}</span>
                        <time>{item.time ?? "--:--"}</time>
                        <strong>{item.label}</strong>
                        {isCurrent ? <span className="status-label">目前</span> : null}
                        {isSkipped ? <span className="status-label muted">已略過</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <button className="text-button reset-button" type="button" onClick={resetToday}><RotateCcw aria-hidden="true" />重設今日進度</button>
            </section>
          </section>
        ) : null}

        {tab === "itinerary" ? (
          <section>
            <header className="section-heading"><p className="station-code">4 DAYS · 3 NIGHTS</p><h1>完整行程</h1><p>先看日期，需要細節時再展開。</p></header>
            {normalDays.map((itineraryDay) => {
              const rainyDay = rainyDays.find((candidate) => candidate.date === itineraryDay.date);
              return (
                <article className="day-card" key={itineraryDay.date}>
                  <div className="day-index"><span>DAY</span><strong>{itineraryDay.day}</strong></div>
                  <div className="day-content">
                    <time>{itineraryDay.date}</time>
                    <details><summary><Sun aria-hidden="true" />{itineraryDay.title}<ChevronDown aria-hidden="true" /></summary><MarkdownContent markdown={itineraryDay.markdown} /></details>
                    {rainyDay ? <details><summary><CloudRain aria-hidden="true" />{rainyDay.title}<ChevronDown aria-hidden="true" /></summary><MarkdownContent markdown={rainyDay.markdown} /></details> : null}
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        {tab === "attention" ? <AttentionList /> : null}
        {tab === "preparation" ? <PreparationPage completed={preparationProgress} onToggle={togglePreparation} /> : null}

        <footer className="build-info">
          資料更新 {new Date(__BUILD_TIME__).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}
          <span> · 天氣 <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></span>
        </footer>
      </main>

      <nav className="bottom-nav" aria-label="主要導覽">
        <button type="button" aria-current={tab === "today" ? "page" : undefined} onClick={() => setTab("today")}><Navigation aria-hidden="true" />今天</button>
        <button type="button" aria-current={tab === "itinerary" ? "page" : undefined} onClick={() => setTab("itinerary")}><Map aria-hidden="true" />行程</button>
        <button type="button" aria-current={tab === "attention" ? "page" : undefined} onClick={() => setTab("attention")}><ListChecks aria-hidden="true" />注意</button>
        <button type="button" aria-current={tab === "preparation" ? "page" : undefined} onClick={() => setTab("preparation")}><ClipboardCheck aria-hidden="true" />行前</button>
      </nav>
      {routeImageExpanded ? (
        <div className="route-lightbox" role="dialog" aria-modal="true" aria-label="放大的今日交通路線圖">
          <button ref={routeCloseButtonRef} type="button" onClick={() => { setRouteImageExpanded(false); routeOpenButtonRef.current?.focus(); }} aria-label="關閉放大路線圖"><X aria-hidden="true" />關閉</button>
          <img src={routeImages[selectedDay.date]} alt={`${selectedDay.title}交通路線圖`} />
        </div>
      ) : null}
    </div>
  );
}
