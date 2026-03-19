import { describe, expect, it } from "vitest";

import {
  legacySmartTurretExtensionFixtures,
  seededSmartTurretExtensionFixtures,
  smartTurretExtensionFixtures,
} from "../__fixtures__/graphs/smartTurretExtensionFixtures";

describe("smart turret extension fixture scaffolds", () => {
  it("keeps the base fixture catalogue populated", () => {
    expect(smartTurretExtensionFixtures.length).toBeGreaterThan(0);
  });

  it("provides legacy restore fixtures for migration coverage", () => {
    expect(legacySmartTurretExtensionFixtures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ expectedOutcome: "auto-migrate" }),
        expect.objectContaining({ expectedOutcome: "remediate" }),
      ]),
    );
  });

  it("provides seeded contract scaffolds for load-panel coverage", () => {
    expect(seededSmartTurretExtensionFixtures.length).toBeGreaterThan(0);
    expect(seededSmartTurretExtensionFixtures[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        fixture: expect.objectContaining({ moduleName: expect.any(String) }),
      }),
    );
  });
});