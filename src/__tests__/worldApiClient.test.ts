import { describe, expect, it, vi } from "vitest";

import { createJsonResponse } from "../test/turretSimulationMocks";
import {
  WORLD_API_MAX_PAGE_SIZE,
  buildWorldApiUrl,
  fetchWorldApiShips,
  fetchWorldApiTribes,
  getWorldApiBaseUrl,
} from "../utils/worldApiClient";

describe("worldApiClient", () => {
  it("uses the maintainer-confirmed public Stillness origin", () => {
    expect(getWorldApiBaseUrl()).toBe("https://world-api-stillness.live.pub.evefrontier.com");
  });

  it.each([null, {}, { data: "wrong" }])("rejects malformed envelopes %j", async (payload) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse(payload));
    await expect(fetchWorldApiTribes({ fetchFn })).rejects.toThrow("Invalid collection response");
  });

  it("accepts valid empty data and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({ data: [] }));
    await expect(fetchWorldApiShips({ fetchFn, signal, limit: 0, offset: 0 })).resolves.toEqual([]);
    expect(fetchFn).toHaveBeenCalledWith("https://world-api-stillness.live.pub.evefrontier.com/v2/ships?limit=0&offset=0", { signal });
  });

  it("identifies HTTP and network failures as World API errors", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(fetchWorldApiShips({ fetchFn })).rejects.toThrow("World API lookup failed. Failed to fetch");
    await expect(fetchWorldApiTribes({ fetchFn })).rejects.toThrow("World API lookup failed. Request failed with status 503");
  });
  it("fetches ships from the documented World API endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({
      data: [{ id: 81611, name: "Chumaq", classId: 419, className: "Combat Battlecruiser" }],
    }));

    await expect(fetchWorldApiShips({ fetchFn })).resolves.toEqual([
      { id: 81611, name: "Chumaq", classId: 419, className: "Combat Battlecruiser" },
    ]);

    expect(fetchFn).toHaveBeenCalledWith(`${getWorldApiBaseUrl()}/v2/ships?limit=1000`, { signal: undefined });
  });

  it("forwards limit and offset to the documented tribes endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({
      data: [{ id: 7, name: "Sepharim", nameShort: "SEP" }],
    }));

    await expect(fetchWorldApiTribes({ fetchFn, limit: 20, offset: 40 })).resolves.toEqual([
      { id: 7, name: "Sepharim", nameShort: "SEP" },
    ]);

    expect(fetchFn).toHaveBeenCalledWith(`${getWorldApiBaseUrl()}/v2/tribes?limit=20&offset=40`, { signal: undefined });
  });
});

describe("worldApiClient pagination defaults", () => {
  it("requests the whole collection when no page size is given", () => {
    expect(WORLD_API_MAX_PAGE_SIZE).toBe(1000);
    expect(buildWorldApiUrl("/v2/tribes")).toBe(`${getWorldApiBaseUrl()}/v2/tribes?limit=1000`);
  });

  it("keeps an explicitly narrowed page size", () => {
    expect(buildWorldApiUrl("/v2/tribes", { limit: 0 })).toBe(`${getWorldApiBaseUrl()}/v2/tribes?limit=0`);
    expect(buildWorldApiUrl("/v2/tribes", { limit: 25 })).toBe(`${getWorldApiBaseUrl()}/v2/tribes?limit=25`);
  });

  it("returns every tribe past the service's default hundred-record page", async () => {
    const data = Array.from({ length: 167 }, (_, index) => ({ id: 98000521 + index, name: `Tribe ${String(index)}` }));
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({ data, metadata: { total: 167, limit: 1000, offset: 0 } }));

    await expect(fetchWorldApiTribes({ fetchFn })).resolves.toHaveLength(167);
    expect(fetchFn).toHaveBeenCalledWith(`${getWorldApiBaseUrl()}/v2/tribes?limit=1000`, { signal: undefined });
  });

  it("collapses a repeated id onto its resolved record", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({
      data: [
        { id: 1000167, name: "NPC Corp 1000167", nameShort: "C086", taxRate: 0 },
        { id: 98000668, name: "Algorithmic Warfare", nameShort: "AWAR" },
        { id: 1000167, name: "Clonebank 86", nameShort: "CO86", taxRate: 0.11 },
      ],
    }));

    await expect(fetchWorldApiTribes({ fetchFn })).resolves.toEqual([
      { id: 1000167, name: "Clonebank 86", nameShort: "CO86", taxRate: 0.11 },
      { id: 98000668, name: "Algorithmic Warfare", nameShort: "AWAR" },
    ]);
  });

  it("keeps records that carry no id", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({ data: [null, { name: "unidentified" }, null] }));

    await expect(fetchWorldApiShips({ fetchFn })).resolves.toEqual([null, { name: "unidentified" }, null]);
  });

  it("warns when the service reports more records than the requested limit", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({
      data: [{ id: 7, name: "Sepharim" }],
      metadata: { total: 101, limit: 100, offset: 0 },
    }));

    await fetchWorldApiTribes({ fetchFn, limit: 100 });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("at least 101 records exist for a limit of 100"));
    warn.mockRestore();
  });

  it("stays quiet when the collection fits inside the limit", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({
      data: [{ id: 7, name: "Sepharim" }],
      metadata: { total: 167, limit: 1000, offset: 0 },
    }));

    await fetchWorldApiTribes({ fetchFn });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
