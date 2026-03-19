import { describe, expect, it } from "vitest";

import { hashCharacterAddress } from "../../../compiler/generators/listHash";

describe("hashCharacterAddress", () => {
  it("normalizes address casing before hashing", () => {
    expect(hashCharacterAddress("0xAbC123")).toBe(hashCharacterAddress("0xabc123"));
  });
});