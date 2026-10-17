import { describe, expect, it } from "vitest";

import {
  ONBOARDING_ROUTE,
  buildOnboardingLink,
  parseOnboardingLink,
  type OnboardingLinkParams,
} from "../utils/onboardingLink";

const params: OnboardingLinkParams = {
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
};

const search = "?package=0xfeedface&module=starter_contract&network=testnet:stillness";

describe("onboarding links", () => {
  it("reads a well-formed link", () => {
    expect(parseOnboardingLink(search)).toEqual({ ok: true, params });
  });

  it("reads a link whose parameters are in any order, with or without the leading question mark", () => {
    expect(parseOnboardingLink("network=testnet:utopia&package=0xabc&module=kos_first")).toEqual({
      ok: true,
      params: { packageId: "0xabc", moduleName: "kos_first", targetId: "testnet:utopia" },
    });
  });

  it("explains an empty link rather than reporting a malformed package", () => {
    const result = parseOnboardingLink("");
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toContain("carries no contract details");
  });

  it.each([
    ["a package id without 0x", "package=feedface&module=starter_contract&network=testnet:stillness", "package id"],
    ["an over-long package id", `package=0x${"f".repeat(65)}&module=starter_contract&network=testnet:stillness`, "package id"],
    ["a non-hex package id", "package=0xzz&module=starter_contract&network=testnet:stillness", "package id"],
    ["a missing package id", "module=starter_contract&network=testnet:stillness", "package id"],
    ["a module starting with a digit", "package=0xfeedface&module=1starter&network=testnet:stillness", "module"],
    ["a module with punctuation", "package=0xfeedface&module=starter-contract&network=testnet:stillness", "module"],
    ["a missing module", "package=0xfeedface&network=testnet:stillness", "module"],
    ["a local network", "package=0xfeedface&module=starter_contract&network=local", "network"],
    ["an unknown network", "package=0xfeedface&module=starter_contract&network=mainnet", "network"],
    ["a missing network", "package=0xfeedface&module=starter_contract", "network"],
  ])("refuses %s", (_label, query, mentions) => {
    const result = parseOnboardingLink(query);
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toContain(mentions);
  });

  it("builds a link that parses back to the same contract", () => {
    const link = buildOnboardingLink(params, "https://frontier-flow.scetrov.live");
    expect(link).toBe(`https://frontier-flow.scetrov.live${ONBOARDING_ROUTE}?package=0xfeedface&module=starter_contract&network=testnet%3Astillness`);
    expect(parseOnboardingLink(new URL(link).search)).toEqual({ ok: true, params });
  });

  it("does not double the separator when the origin carries a trailing slash", () => {
    expect(buildOnboardingLink(params, "https://example.test/")).toContain(`example.test${ONBOARDING_ROUTE}?`);
  });
});
