import { describe, expect, it } from "vitest";
import { notes, searchNotes } from "./notes";

describe("offline note search", () => {
  it("finds the matching Markdown section and returns a useful excerpt", () => {
    const results = searchNotes(notes, "博愛座");

    expect(results[0]).toMatchObject({
      noteTitle: "韓國與釜山文化注意事項",
      sectionTitle: "地鐵、公車與電扶梯",
    });
    expect(results[0]?.excerpt).toContain("優先席留給長者");
  });
});
