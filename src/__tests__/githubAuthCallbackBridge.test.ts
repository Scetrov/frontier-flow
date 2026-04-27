import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";

import { beforeEach, describe, expect, it, vi } from "vitest";

const callbackBridgeSource = readFileSync(resolve(process.cwd(), "public/github-auth-callback.js"), "utf8");

function runCallbackBridgeScript(): void {
  runInThisContext(`(() => {\n${callbackBridgeSource}\n})();`, {
    filename: "github-auth-callback.js",
  });
}

describe("github-auth-callback bridge", () => {
  beforeEach(() => {
    document.body.removeAttribute("data-auth-payload");
    document.body.innerHTML = "";
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: undefined,
    });
  });

  it("posts an explicit error when the callback payload is missing", () => {
    const postMessage = vi.fn();
    const closeSpy = vi.spyOn(window, "close").mockImplementation(() => undefined);

    Object.defineProperty(window, "opener", {
      configurable: true,
      value: {
        closed: false,
        postMessage,
      },
    });

    runCallbackBridgeScript();

    expect(postMessage).toHaveBeenCalledWith({
      type: "ff:github-auth:error",
      reason: "exchange_failed",
      message: "GitHub sign-in callback did not include a result payload.",
    }, window.location.origin);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});