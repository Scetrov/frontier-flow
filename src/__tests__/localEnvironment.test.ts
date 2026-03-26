import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LOCAL_ENVIRONMENT_STORAGE_KEY,
  loadLocalEnvironmentConfig,
  saveLocalEnvironmentConfig,
  validateWorldPackageViaGraphQl,
} from "../data/localEnvironment";

describe("localEnvironment", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("loads defaults and saves trimmed local environment settings", () => {
    expect(loadLocalEnvironmentConfig(window.localStorage)).toMatchObject({
      rpcUrl: "http://localhost:9000",
      graphQlUrl: "http://localhost:9125/graphql",
      worldPackageVersion: "0.0.18",
      useEphemeralKeypair: true,
    });

    saveLocalEnvironmentConfig(window.localStorage, {
      rpcUrl: "  http://localhost:9001  ",
      graphQlUrl: "  http://localhost:9124/graphql  ",
      worldPackageId: "  0xabc123  ",
      worldPackageVersion: "  0.0.21  ",
      useEphemeralKeypair: false,
    });

    expect(JSON.parse(window.localStorage.getItem(LOCAL_ENVIRONMENT_STORAGE_KEY) ?? "{}")).toMatchObject({
      rpcUrl: "http://localhost:9001",
      graphQlUrl: "http://localhost:9124/graphql",
      worldPackageId: "0xabc123",
      worldPackageVersion: "0.0.21",
      useEphemeralKeypair: false,
    });
  });

  it("defaults missing signing-mode storage to the ephemeral keypair flow", () => {
    window.localStorage.setItem(LOCAL_ENVIRONMENT_STORAGE_KEY, JSON.stringify({
      version: 1,
      rpcUrl: "http://localhost:9000",
      graphQlUrl: "http://localhost:9125/graphql",
      worldPackageId: "0xabc123",
      worldPackageVersion: "0.0.18",
      updatedAt: "2026-03-26T00:00:00.000Z",
    }));

    expect(loadLocalEnvironmentConfig(window.localStorage).useEphemeralKeypair).toBe(true);
  });

  it("validates world package ids through the configured GraphQL endpoint", async () => {
    const result = await validateWorldPackageViaGraphQl({
      fetchFn: () => Promise.resolve(new Response(JSON.stringify({
        data: {
          object: {
            address: "0xabc123",
            asMovePackage: {
              address: "0xabc123",
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } })),
      graphQlUrl: "http://localhost:9125/graphql",
      worldPackageId: "0xabc123",
    });

    expect(result).toEqual({ isValid: true });
  });

  it("surfaces a validation error when the package is not returned as a Move package", async () => {
    const result = await validateWorldPackageViaGraphQl({
      fetchFn: () => Promise.resolve(new Response(JSON.stringify({
        data: {
          object: null,
        },
      }), { status: 200, headers: { "content-type": "application/json" } })),
      graphQlUrl: "http://localhost:9125/graphql",
      worldPackageId: "0xabc123",
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain("was not found as a Move package");
  });
});