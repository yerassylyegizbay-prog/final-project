import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AIProvider } from "@/lib/ai/types";
import { analyzeLecture } from "@/lib/analyze";
import { processLecture } from "@/lib/pipeline";
import { AnalysisSchema, type Analysis, type Lecture } from "@/lib/schemas";
import { getLecture, loadText, mutate, newId, now, readDb } from "@/lib/store";

/** End-to-end: upload → extract → (demo) AI → folder → videos, using a temporary data folder. */

let tmp: string;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sabaq-test-"));
  process.env.SABAQ_DATA_DIR = tmp;
  process.env.AI_PROVIDER = "mock";
  process.env.YOUTUBE_API_KEY = "";
  process.env.GEMINI_API_KEY = "";
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

async function upload(sampleName: string, asName = sampleName) {
  const id = newId();
  const filePath = path.join(tmp, `${id}-${asName}`);
  fs.copyFileSync(path.join(__dirname, "..", "samples", sampleName), filePath);
  const lecture: Lecture = {
    id, folderId: null, title: asName, fileName: asName, fileKind: "", status: "processing", stage: "Queued",
    createdAt: now(), updatedAt: now(), outputLanguage: "auto", provider: "mock", model: "demo", textChars: 0, chunked: false, truncated: false, chat: [],
  };
  await mutate((db) => {
    db.lectures.push(lecture);
  });
  await processLecture({ lectureId: id, filePath, fileName: asName, mimeType: "", folderChoice: "auto", language: "auto" });
  return { id, filePath };
}

describe("processLecture (demo provider)", () => {
  it.each([
    ["01-computer-networks-osi-model.pdf", "Computer Networks"],
    ["02-sorting-algorithms.pptx", "Algorithms"],
    ["03-cpu-fetch-decode-execute.vtt", "Computer Architecture"],
  ])("turns %s into a valid study pack filed under %s", async (file, subject) => {
    const { id, filePath } = await upload(file);
    const l = (await getLecture(id))!;
    expect(l.error).toBeUndefined();
    expect(l.status).toBe("ready");
    expect(AnalysisSchema.safeParse(l.analysis).success).toBe(true);
    expect(l.videos?.source).toBe("search-links");
    const db = await readDb();
    expect(db.folders.find((f) => f.id === l.folderId)?.name).toBe(subject);
    expect(fs.existsSync(filePath)).toBe(false); // privacy: upload deleted
    expect((await loadText(id)).length).toBeGreaterThan(500);
  });

  it("explains that audio needs a Gemini key", async () => {
    const { id } = await upload("03-cpu-fetch-decode-execute.vtt", "recording.mp3");
    const l = (await getLecture(id))!;
    expect(l.status).toBe("error");
    expect(l.error).toMatch(/GEMINI_API_KEY/);
  });
});

describe("analyzeLecture with long lectures", () => {
  it("summarises parts first (map) and then builds one study pack (reduce)", async () => {
    const pack: Analysis = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "sample-analysis.json"), "utf8"));
    const schemas: string[] = [];
    const provider: AIProvider = {
      name: "claude",
      model: "fake",
      async generateJson(req) {
        schemas.push(req.schemaName);
        if (req.schemaName === "save_chunk_notes") return { topics: ["part"], keyPoints: ["a key point"], terms: [] };
        expect(req.prompt).toContain("detailed notes from each part");
        return pack;
      },
      async chat() {
        return "";
      },
    };
    const longText = Array.from({ length: 60 }, (_, i) => `--- Slide ${i} ---\n${"Sorting compares and swaps elements. ".repeat(40)}`).join("\n\n");
    const stages: string[] = [];
    const r = await analyzeLecture(provider, longText, {
      fileName: "long.pptx",
      kind: "pptx",
      language: "en",
      onStage: (s) => {
        stages.push(s);
      },
      limits: { singlePassChars: 20_000, chunkChars: 20_000 },
    });
    expect(r.chunked).toBe(true);
    expect(schemas.filter((s) => s === "save_chunk_notes").length).toBeGreaterThan(2);
    expect(schemas.at(-1)).toBe("save_study_pack");
    expect(stages[0]).toMatch(/part 1 of/);
    expect(r.analysis.title).toBe(pack.title);
  });
});
