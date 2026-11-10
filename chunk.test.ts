import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/chunk";

const slide = (n: number) => `--- Slide ${n} ---\n${`Point ${n}: the CPU fetches, decodes and executes instructions. `.repeat(12)}`;

describe("chunkText", () => {
  it("keeps short text in one chunk", () => {
    expect(chunkText("short lecture", 1000)).toEqual(["short lecture"]);
    expect(chunkText("   ", 1000)).toEqual([]);
  });

  it("never exceeds the maximum size and loses no content", () => {
    const text = Array.from({ length: 40 }, (_, i) => slide(i + 1)).join("\n\n");
    const chunks = chunkText(text, 3000, 200);
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(3000);
    for (let i = 1; i <= 40; i++) expect(chunks.some((c) => c.includes(`--- Slide ${i} ---`))).toBe(true);
  });

  it("splits one huge paragraph (a transcript without line breaks)", () => {
    const text = "This is one sentence about networks. ".repeat(2000);
    const chunks = chunkText(text, 5000, 300);
    expect(chunks.length).toBeGreaterThan(10);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(5000);
  });

  it("adds overlap so ideas crossing a boundary are kept", () => {
    const paras = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} ${"word ".repeat(60)}`);
    const chunks = chunkText(paras.join("\n\n"), 2000, 300);
    const lastOfFirst = chunks[0].slice(-100).trim().split(/\s+/).pop()!;
    expect(chunks[1].slice(0, 400)).toContain(lastOfFirst);
  });
});
