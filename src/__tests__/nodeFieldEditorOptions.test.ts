import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildShipOption, buildTribeOption, loadWorldApiOptions, resetNodeFieldEditorOptionCacheForTests } from "../nodes/nodeFieldEditorOptions";
import { buildWorldApiUrl } from "../utils/worldApiClient";

beforeEach(() => { resetNodeFieldEditorOptionCacheForTests(); vi.restoreAllMocks(); });
const response = (data: unknown) => new Response(JSON.stringify(data));

describe("World API option cache", () => {
  it("maps collections and isolates cache entries by resolved URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === "https://world-api-stillness.live.pub.evefrontier.com/v2/tribes") return Promise.resolve(response({ data: [{ id: 7, name: "Tribe", nameShort: "TRI" }, null] }));
      if (url === "https://world-api-stillness.live.pub.evefrontier.com/v2/ships") return Promise.resolve(response({ data: [{ id: 8, name: "Ship", className: "Frigate" }] }));
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });
    expect(await loadWorldApiOptions(buildWorldApiUrl("/v2/tribes"), buildTribeOption)).toEqual([{ value: 7, label: "Tribe", description: "TRI" }]);
    expect(await loadWorldApiOptions(buildWorldApiUrl("/v2/ships"), buildShipOption)).toEqual([{ value: 8, label: "Ship", description: "Frigate" }]);
    await loadWorldApiOptions(buildWorldApiUrl("/v2/tribes"), buildTribeOption);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it.each([null, {}, { data: {} }, "invalid"])("does not cache malformed envelope %j", async (payload) => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(payload)).mockResolvedValueOnce(response({ data: [] }));
    const url = buildWorldApiUrl("/v2/tribes");
    await expect(loadWorldApiOptions(url, buildTribeOption)).rejects.toThrow("World API lookup failed");
    await expect(loadWorldApiOptions(url, buildTribeOption)).resolves.toEqual([]);
    await loadWorldApiOptions(url, buildTribeOption);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it.each([new TypeError("Failed to fetch"), new Error("HTTP")])("retries failures rather than caching empty success", async (error) => {
    const spy = vi.spyOn(globalThis, "fetch");
    if (error.message === "HTTP") spy.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    else spy.mockRejectedValueOnce(error);
    spy.mockResolvedValueOnce(response({ data: [] }));
    const url = buildWorldApiUrl("/v2/ships");
    await expect(loadWorldApiOptions(url, buildShipOption)).rejects.toThrow("World API lookup failed");
    await expect(loadWorldApiOptions(url, buildShipOption)).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
