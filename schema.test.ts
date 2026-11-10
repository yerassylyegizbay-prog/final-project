import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateValidated, parseModelJson } from "@/lib/ai/json";
import type { AIProvider } from "@/lib/ai/types";
import { AppError } from "@/lib/errors";
import { AnalysisSchema, normalizeAnalysis, toProviderJsonSchema, type Analysis } from "@/lib/schemas";

const fixture = (): Analysis => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "sample-analysis.json"), "utf8"));

describe("AnalysisSchema", () => {
  it("accepts a realistic study pack", () => {
    const r = AnalysisSchema.safeParse(fixture());
    expect(r.success).toBe(true);
  });

  it("rejects answers with missing or wrong fields", () => {
    const bad = { ...fixture(), summary: undefined, level: "expert" };
    const r = AnalysisSchema.safeParse(bad);
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("summary");
    expect(paths).toContain("level");
  });

  it("rejects an unknown infographic kind", () => {
    const a = fixture();
    expect(AnalysisSchema.safeParse({ ...a, infographic: { ...a.infographic, kind: "pie" } }).success).toBe(false);
  });
});

describe("normalizeAnalysis", () => {
  it("turns a broken multiple-choice question into a short-answer question", () => {
    const a = fixture();
    a.practiceQuestions[0] = { ...a.practiceQuestions[0], correctOption: 9 };
    a.practiceQuestions[1] = { ...a.practiceQuestions[1], options: ["only one"] };
    const n = normalizeAnalysis(a);
    expect(n.practiceQuestions[0].type).toBe("short");
    expect(n.practiceQuestions[0].options).toBeUndefined();
    expect(n.practiceQuestions[1].type).toBe("short");
    expect(n.practiceQuestions[2].type).toBe("mcq");
  });

  it("trims long lists, dedupes YouTube queries and strips code fences", () => {
    const a = fixture();
    a.keyConcepts = Array.from({ length: 30 }, (_, i) => ({ term: `T${i}`, definition: "d" }));
    a.youtubeQueries = ["merge sort", "merge sort", " quicksort ", "a", "b"];
    a.examples[0].code = "```python\nprint(1)\n```";
    const n = normalizeAnalysis(a);
    expect(n.keyConcepts).toHaveLength(12);
    expect(n.youtubeQueries).toEqual(["merge sort", "quicksort", "a"]);
    expect(n.examples[0].code).toBe("print(1)");
  });
});

describe("JSON for providers", () => {
  it("produces a JSON schema without $schema, and without additionalProperties for Gemini", () => {
    const claude = toProviderJsonSchema(AnalysisSchema);
    const gemini = toProviderJsonSchema(AnalysisSchema, { forGemini: true });
    expect(claude.$schema).toBeUndefined();
    expect(claude.type).toBe("object");
    expect((claude.required as string[]).includes("infographic")).toBe(true);
    expect(JSON.stringify(gemini)).not.toContain("additionalProperties");
  });

  it("parses JSON wrapped in code fences or text", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseModelJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(parseModelJson('Here you go: {"a":3} hope it helps')).toEqual({ a: 3 });
    expect(() => parseModelJson('{"a": 1, "b": [1, 2')).toThrow(AppError);
  });
});

describe("generateValidated", () => {
  const fakeProvider = (answers: unknown[]): AIProvider & { calls: string[] } => {
    const calls: string[] = [];
    return {
      name: "claude",
      model: "fake",
      calls,
      async generateJson(req) {
        calls.push(req.prompt);
        return answers[calls.length - 1];
      },
      async chat() {
        return "";
      },
    };
  };

  it("retries once with the validation errors, then succeeds", async () => {
    const p = fakeProvider([{ title: "only a title" }, fixture()]);
    const out = await generateValidated(p, { system: "s", prompt: "make pack", schema: AnalysisSchema, schemaName: "save_study_pack" });
    expect(out.title).toBe(fixture().title);
    expect(p.calls).toHaveLength(2);
    expect(p.calls[1]).toContain("did not match the required JSON schema");
    expect(p.calls[1]).toContain("summary");
  });

  it("gives a friendly error after two invalid answers", async () => {
    const p = fakeProvider([{}, { nope: true }]);
    await expect(generateValidated(p, { system: "s", prompt: "p", schema: AnalysisSchema, schemaName: "x" })).rejects.toThrow(/unexpected format/);
  });
});
