import { describe, expect, it, vi } from "vitest";

import { createJsonResponse } from "../test/turretSimulationMocks";
import { fetchWorldApiShips, fetchWorldApiTribes, getWorldApiBaseUrl } from "../utils/worldApiClient";

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

    expect(fetchFn).toHaveBeenCalledWith(`${getWorldApiBaseUrl()}/v2/ships`, { signal: undefined });
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