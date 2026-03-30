import { describe, expect, it, vi } from "vitest";

import { createJsonResponse } from "../test/turretSimulationMocks";
import { fetchWorldApiShips, fetchWorldApiTribes, getWorldApiBaseUrl } from "../utils/worldApiClient";

describe("worldApiClient", () => {
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