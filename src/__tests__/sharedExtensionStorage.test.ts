import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SHARED_EXTENSION_CHANGE_EVENT,
  SHARED_EXTENSION_STORAGE_KEY,
  addSharedExtension,
  dedupeSharedExtensions,
  getSharedExtensionKey,
  loadSharedExtensions,
  removeSharedExtension,
  saveSharedExtensions,
  type SharedExtension,
} from "../utils/sharedExtensionStorage";

const PACKAGE = "0xfeedface";
const extension: SharedExtension = {
  version: 1,
  packageId: PACKAGE,
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: PACKAGE,
  deployedAt: "2026-10-12T00:00:00.000Z",
  contractName: "Starter Contract",
};

function storageFixture(raw?: string): Storage {
  const entries = new Map<string, string>(raw === undefined ? [] : [[SHARED_EXTENSION_STORAGE_KEY, raw]]);
  return {
    get length() { return entries.size; },
    clear: () => { entries.clear(); },
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => { entries.delete(key); },
    setItem: (key: string, value: string) => { entries.set(key, value); },
  };
}

afterEach(() => { vi.restoreAllMocks(); });

describe("shared extension storage", () => {
  it("keys an extension by target, package and module so one package can serve two networks", () => {
    expect(getSharedExtensionKey(extension)).toBe(`testnet:stillness:${PACKAGE}:starter_contract`);
    expect(getSharedExtensionKey({ ...extension, targetId: "testnet:utopia" })).not.toBe(getSharedExtensionKey(extension));
  });

  it("round-trips a saved extension", () => {
    const storage = storageFixture();
    saveSharedExtensions(storage, [extension]);
    expect(loadSharedExtensions(storage)).toEqual([extension]);
  });

  it.each([
    ["absent storage", undefined],
    ["unparseable json", "{"],
    ["a non-array payload", JSON.stringify({ packageId: PACKAGE })],
    ["an empty array", "[]"],
  ])("reads no extensions from %s", (_label, raw) => {
    expect(loadSharedExtensions(storageFixture(raw))).toEqual([]);
  });

  it("tolerates storage being unavailable entirely", () => {
    expect(loadSharedExtensions(undefined)).toEqual([]);
    expect(() => { saveSharedExtensions(undefined, [extension]); }).not.toThrow();
  });

  it.each([
    ["a missing package id", { ...extension, packageId: undefined }],
    ["a non-hex package id", { ...extension, packageId: "feedface" }],
    ["an over-long package id", { ...extension, packageId: `0x${"f".repeat(65)}` }],
    ["a module name starting with a digit", { ...extension, moduleName: "1starter" }],
    ["a module name with punctuation", { ...extension, moduleName: "starter-contract" }],
    ["a local target", { ...extension, targetId: "local" }],
    ["an unknown target", { ...extension, targetId: "mainnet" }],
  ])("discards an entry with %s", (_label, entry) => {
    expect(loadSharedExtensions(storageFixture(JSON.stringify([entry])))).toEqual([]);
  });

  it("keeps the valid entries alongside malformed ones rather than failing the whole read", () => {
    const raw = JSON.stringify([{ ...extension, packageId: "nope" }, extension, null, 7]);
    expect(loadSharedExtensions(storageFixture(raw))).toEqual([extension]);
  });

  it("substitutes defaults for the fields a shared package cannot supply", () => {
    const raw = JSON.stringify([{ packageId: PACKAGE, moduleName: "starter_contract", targetId: "testnet:stillness" }]);
    expect(loadSharedExtensions(storageFixture(raw))).toEqual([{
      version: 1,
      packageId: PACKAGE,
      moduleName: "starter_contract",
      targetId: "testnet:stillness",
      transactionDigest: PACKAGE,
      deployedAt: new Date(0).toISOString(),
      contractName: "starter_contract",
    }]);
  });

  it("collapses duplicates on read, keeping the last entry for a key", () => {
    const renamed = { ...extension, contractName: "Renamed" };
    expect(loadSharedExtensions(storageFixture(JSON.stringify([extension, renamed])))).toEqual([renamed]);
    expect(dedupeSharedExtensions([extension, renamed])).toEqual([renamed]);
  });

  it("replaces rather than appends when the same package is added twice", () => {
    const renamed = { ...extension, contractName: "Renamed" };
    expect(addSharedExtension([extension], renamed)).toEqual([renamed]);
    expect(addSharedExtension([extension], { ...extension, targetId: "testnet:utopia" })).toHaveLength(2);
  });

  it("removes only the addressed extension", () => {
    const other = { ...extension, targetId: "testnet:utopia" as const };
    expect(removeSharedExtension([extension, other], getSharedExtensionKey(extension))).toEqual([other]);
    expect(removeSharedExtension([extension], "testnet:stillness:0x1:other")).toEqual([extension]);
  });

  it("announces a save so navigation gating outside the authorize view can react", () => {
    const listener = vi.fn();
    window.addEventListener(SHARED_EXTENSION_CHANGE_EVENT, listener);
    try {
      saveSharedExtensions(storageFixture(), [extension]);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(SHARED_EXTENSION_CHANGE_EVENT, listener);
    }
  });
});
