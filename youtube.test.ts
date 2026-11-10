import { describe, expect, it } from "vitest";
import { decodeHtml, findVideos } from "@/lib/youtube";

const item = (id: string, title: string, channel: string) => ({
  id: { kind: "youtube#video", videoId: id },
  snippet: { title, channelTitle: channel, publishedAt: "2024-01-01T00:00:00Z", thumbnails: { medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } } },
});

const okResponse = (items: unknown[]) => new Response(JSON.stringify({ items }), { status: 200, headers: { "Content-Type": "application/json" } });

describe("findVideos", () => {
  it("returns search links (never invented URLs) when there is no API key", async () => {
    const r = await findVideos(["TCP handshake explained"], { apiKey: "" });
    expect(r.source).toBe("search-links");
    expect(r.videos).toEqual([]);
    expect(r.searchLinks[0].url).toBe("https://www.youtube.com/results?search_query=TCP%20handshake%20explained");
    expect(r.note).toMatch(/not configured/);
  });

  it("uses real API results, boosts educational channels and removes duplicates", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      return url.includes("q=merge")
        ? okResponse([item("aaa", "Merge sort in 3 minutes", "Random Channel"), item("bbb", "Merge Sort &amp; Analysis", "Abdul Bari"), item("ccc", "Sorting", "Someone")])
        : okResponse([item("ccc", "Sorting", "Someone"), item("ddd", "Quicksort", "Another"), item("eee", "Big O", "x"), item("fff", "Heaps", "y")]);
    }) as typeof fetch;

    const r = await findVideos(["merge sort", "quicksort"], { apiKey: "KEY", language: "en", fetchImpl });
    expect(r.source).toBe("api");
    expect(r.videos).toHaveLength(4);
    expect(r.videos[0].id).toBe("bbb"); // trusted channel ranked first
    expect(r.videos[0].title).toBe("Merge Sort & Analysis");
    expect(r.videos[0].trustedChannel).toBe(true);
    expect(r.videos[0].url).toBe("https://www.youtube.com/watch?v=bbb");
    expect(new Set(r.videos.map((v) => v.id)).size).toBe(4);
    expect(urls[0]).toContain("part=snippet");
    expect(urls[0]).toContain("type=video");
    expect(urls[0]).toContain("relevanceLanguage=en");
    expect(urls[0]).toContain("safeSearch=strict");
    expect(urls).toHaveLength(2); // quota-friendly: max two searches
  });

  it("falls back to search links when the quota is exceeded", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: { message: "quota", errors: [{ reason: "quotaExceeded" }] } }), { status: 403 })) as unknown as typeof fetch;
    const r = await findVideos(["binary search"], { apiKey: "KEY", fetchImpl });
    expect(r.source).toBe("search-links");
    expect(r.note).toMatch(/daily quota exceeded/);
    expect(r.searchLinks).toHaveLength(1);
  });

  it("decodes HTML entities in titles", () => {
    expect(decodeHtml("What&#39;s a &quot;pointer&quot;? C &amp; C++")).toBe(`What's a "pointer"? C & C++`);
  });
});
