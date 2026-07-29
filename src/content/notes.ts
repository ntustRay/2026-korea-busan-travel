import normalItinerary from "../../notes/itinerary/itinerary-normal.md?raw";
import rainyItinerary from "../../notes/itinerary/itinerary-rainy.md?raw";
import busanPass from "../../notes/guides/visit-busan-pass.md?raw";
import transport from "../../notes/guides/交通.md?raw";
import preparation from "../../notes/guides/出發前注意事項.md?raw";
import apps from "../../notes/guides/必裝 Korean APP.md?raw";
import videoNotes from "../../notes/guides/韓國旅行影片重點.md?raw";
import culture from "../../notes/guides/韓國與釜山文化注意事項.md?raw";

export type NoteCategory = "itinerary" | "attention" | "more";

export interface Note {
  id: string;
  title: string;
  category: NoteCategory;
  markdown: string;
}

export interface SearchResult {
  noteId: string;
  noteTitle: string;
  sectionTitle: string;
  excerpt: string;
}

export const notes: Note[] = [
  { id: "normal", title: "正常行程", category: "itinerary", markdown: normalItinerary },
  { id: "rainy", title: "雨備行程", category: "itinerary", markdown: rainyItinerary },
  { id: "culture", title: "韓國與釜山文化注意事項", category: "attention", markdown: culture },
  { id: "preparation", title: "出發前注意事項", category: "attention", markdown: preparation },
  { id: "transport", title: "交通注意事項", category: "attention", markdown: transport },
  { id: "apps", title: "韓國必裝 App", category: "more", markdown: apps },
  { id: "pass", title: "Visit Busan Pass", category: "more", markdown: busanPass },
  { id: "videos", title: "韓國旅行影片重點", category: "more", markdown: videoNotes },
];

const searchAliases: Record<string, string[]> = {
  博愛座: ["博愛座", "優先席"],
};

function cleanMarkdown(line: string): string {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

export function searchNotes(allNotes: Note[], query: string): SearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-Hant");

  if (!normalizedQuery) {
    return [];
  }

  const terms = searchAliases[query.trim()] ?? [normalizedQuery];
  const results: SearchResult[] = [];

  for (const note of allNotes) {
    let sectionTitle = note.title;

    for (const line of note.markdown.split("\n")) {
      const heading = line.match(/^#{1,4}\s+(.+)/);

      if (heading?.[1]) {
        sectionTitle = cleanMarkdown(heading[1]);
        continue;
      }

      const excerpt = cleanMarkdown(line);
      const matches = terms.some((term) =>
        excerpt.toLocaleLowerCase("zh-Hant").includes(term.toLocaleLowerCase("zh-Hant")),
      );

      if (excerpt && matches) {
        results.push({
          noteId: note.id,
          noteTitle: note.title,
          sectionTitle,
          excerpt,
        });
      }
    }
  }

  return results;
}
