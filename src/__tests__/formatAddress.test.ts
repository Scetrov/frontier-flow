import { describe, expect, it } from "vitest";

import { formatAddress } from "../utils/formatAddress";

describe("formatAddress", () => {
  it("truncates a full Sui address for compact display", () => {
    expect(formatAddress("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")).toBe(
      "0x1234...cdef",
    );
  });

  it("returns short addresses unchanged", () => {
    expect(formatAddress("0x1234")).toBe("0x1234");
  });

  it("returns non-hex-like strings unchanged", () => {
    expect(formatAddress("wallet-address")).toBe("wallet-address");
  });
});