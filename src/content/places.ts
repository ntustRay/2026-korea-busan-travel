export interface Place {
  name: string;
  koreanName: string;
  address: string;
}

export const hotel: Place = {
  name: "Hound Hotel Busan Station",
  koreanName: "하운드호텔 부산역점",
  address: "부산광역시 동구 중앙대로236번길 9",
};

const aquarium: Place = {
  name: "SEA LIFE Busan Aquarium",
  koreanName: "씨라이프 부산 아쿠아리움",
  address: "부산광역시 해운대구 해운대해변로 266",
};

const luge: Place = {
  name: "Skyline Luge Busan",
  koreanName: "스카이라인 루지 부산",
  address: "부산광역시 기장군 기장읍 기장해안로 205",
};

const songdo: Place = {
  name: "Songdo Bay Station",
  koreanName: "송도해상케이블카 송도베이스테이션",
  address: "부산광역시 서구 송도해변로 171",
};

const gwangbok: Place = {
  name: "Lotte Department Store Gwangbok",
  koreanName: "롯데백화점 광복점",
  address: "부산광역시 중구 중앙대로 2",
};

const destinations: Record<string, { sunny: Place; rainy: Place }> = {
  "2026-07-31": { sunny: hotel, rainy: hotel },
  "2026-08-01": { sunny: luge, rainy: aquarium },
  "2026-08-02": { sunny: aquarium, rainy: gwangbok },
  "2026-08-03": { sunny: songdo, rainy: gwangbok },
};

export function destinationFor(date: string, mode: "sunny" | "rainy"): Place {
  return destinations[date]?.[mode] ?? hotel;
}

export function naverMapUrl(place: Place): string {
  const query = encodeURIComponent(place.koreanName);
  const appName = encodeURIComponent("https://ntustray.github.io/2026-korea-busan-travel/");

  return `intent://search?query=${query}&appname=${appName}#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;end`;
}

export function uberUrl(place: Place): string {
  return `uber://?action=setPickup&pickup=my_location&dropoff[nickname]=${encodeURIComponent(place.koreanName)}&dropoff[formatted_address]=${encodeURIComponent(place.address)}`;
}
