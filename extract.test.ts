import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { assertEnoughText, detectKind, extractDocument } from "@/lib/extract";
import { cleanSubtitles } from "@/lib/extract/transcript";

const sample = (name: string) => fs.readFileSync(path.join(__dirname, "..", "samples", name));

describe("PDF extraction", () => {
  it("extracts text page by page from the networks lecture", async () => {
    const r = await extractDocument(sample("01-computer-networks-osi-model.pdf"), "lecture.pdf");
    expect(r.kind).toBe("pdf");
    expect(r.needsVisionRead).toBeUndefined();
    expect(r.text).toContain("--- Page 1 ---");
    expect(r.text).toContain("--- Page 2 ---");
    expect(r.text).toMatch(/OSI/);
    expect(r.text).toMatch(/three-way handshake/i);
  });

  it("flags a PDF without a text layer as scanned", async () => {
    const r = await extractDocument(fs.readFileSync(path.join(__dirname, "fixtures", "scanned-like.pdf")), "scan.pdf");
    expect(r.needsVisionRead).toBe(true);
  });

  it("gives a friendly error for a damaged PDF", async () => {
    await expect(extractDocument(Buffer.from("%PDF-1.4 this is not really a pdf"), "broken.pdf")).rejects.toBeInstanceOf(AppError);
  });
});

describe("PPTX extraction", () => {
  it("extracts slides in order with speaker notes", async () => {
    const r = await extractDocument(sample("02-sorting-algorithms.pptx"), "sorting.pptx");
    expect(r.kind).toBe("pptx");
    const slides = r.text.match(/--- Slide \d+ ---/g) ?? [];
    expect(slides).toHaveLength(8);
    expect(r.text.indexOf("Bubble sort")).toBeLessThan(r.text.indexOf("Merge sort (divide and conquer)"));
    expect(r.text).toContain("[Notes] Stable means equal elements keep their original order.");
    expect(r.text).toContain("O(n log n)");
  });

  it("rejects a file that is not a real PPTX", async () => {
    await expect(extractDocument(Buffer.from("hello"), "fake.pptx")).rejects.toThrow(/could not be opened/);
  });
});

describe("DOCX extraction", () => {
  it("extracts paragraphs and decodes XML entities", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="w"><w:body>
        <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Databases &amp; SQL</w:t></w:r></w:p>
        <w:p><w:r><w:t xml:space="preserve">A primary key </w:t></w:r><w:r><w:t>identifies each row.</w:t></w:r></w:p>
      </w:body></w:document>`,
    );
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const r = await extractDocument(buf, "notes.docx");
    expect(r.text).toBe("Databases & SQL\nA primary key identifies each row.");
  });
});

describe("Transcripts (VTT / SRT)", () => {
  it("removes headers, timestamps, cue numbers and repeated caption lines", async () => {
    const r = await extractDocument(sample("03-cpu-fetch-decode-execute.vtt"), "cpu.vtt");
    expect(r.kind).toBe("subtitles");
    expect(r.text).not.toMatch(/WEBVTT|-->|NOTE|<v /);
    expect(r.text).toContain("fetch decode execute cycle");
    expect(r.text.match(/Then the cycle starts again with the next fetch\./g)).toHaveLength(1);
  });

  it("cleans SRT with styling tags", () => {
    const srt = "1\n00:00:01,000 --> 00:00:03,000\n<i>Binary search</i> halves the range.\n\n2\n00:00:03,000 --> 00:00:05,000\n{\\an8}It needs a sorted array.\n";
    expect(cleanSubtitles(srt)).toBe("Binary search halves the range. It needs a sorted array.");
  });

  it("reads plain text notes", async () => {
    const r = await extractDocument(Buffer.from("﻿Recursion\r\n\r\n\r\n\r\nA function that calls itself.  \r\n"), "notes.txt");
    expect(r.text).toBe("Recursion\n\nA function that calls itself.");
  });
});

describe("file type detection", () => {
  it("routes media to transcription", async () => {
    expect(detectKind("lecture.MP3")).toBe("audio");
    expect(detectKind("lecture.mp4")).toBe("video");
    expect(detectKind("recording", "audio/webm")).toBe("audio");
    const r = await extractDocument(Buffer.from([1, 2, 3]), "talk.m4a");
    expect(r.needsTranscription).toBe(true);
  });

  it("explains how to fix old Office formats", () => {
    expect(() => detectKind("old.ppt")).toThrow(/Save as/);
  });

  it("rejects unsupported files with a friendly message", () => {
    expect(() => detectKind("virus.exe")).toThrow(/not supported/);
  });

  it("rejects empty files", async () => {
    await expect(extractDocument(Buffer.alloc(0), "empty.pdf")).rejects.toThrow(/empty/);
  });

  it("refuses lectures with almost no text", () => {
    expect(() => assertEnoughText("--- Slide 1 ---\nHi")).toThrow(/enough text/);
    expect(() => assertEnoughText("A long enough sentence about how TCP guarantees reliable delivery.")).not.toThrow();
  });
});
