import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useTurretSimulation } from "../hooks/useTurretSimulation";
import { simulationDeploymentState, simulationTurret } from "../test/turretSimulationFixtures";
import type { runTurretSimulation } from "../utils/turretSimulationExecution";

const OWNER = `0x${"1".repeat(64)}`;
const KEY = "testnet:stillness:0xfeedface:starter_contract";
const SUCCESS = { kind: "success", entries: [{ targetItemId: "900001", priorityWeight: "120" }], rawReturnedBytes: new Uint8Array() } as const;

async function setup() {
  const completions: ((result: Awaited<ReturnType<typeof runTurretSimulation>>) => void)[] = [];
  const run = vi.fn<typeof runTurretSimulation>(() => new Promise((resolve) => { completions.push(resolve); }));
  const options = {
    deploymentKey: KEY,
    deploymentState: simulationDeploymentState,
    turrets: [simulationTurret],
    walletAddress: OWNER as string | null,
    fetchSimulationOwnerCharacterIdFn: vi.fn(() => Promise.resolve("0x333")),
    loadSimulationReferenceDataFn: vi.fn(() => Promise.resolve({ characterOptions: [], shipOptions: [], tribeOptions: [], errorMessages: [] })),
    runTurretSimulationFn: run,
  };
  const hook = renderHook((props) => useTurretSimulation(props), { initialProps: options });
  act(() => { hook.result.current.openSimulation({ deploymentKey: KEY, deploymentState: simulationDeploymentState, turret: simulationTurret }); });
  await waitFor(() => { expect(hook.result.current.session.isHydratingOwnerCharacter).toBe(false); });
  act(() => {
    hook.result.current.updateField("itemId", "900001");
    hook.result.current.updateField("typeId", "900002");
    hook.result.current.updateField("groupId", "25");
    hook.result.current.updateField("characterId", 42);
    hook.result.current.updateField("characterTribe", 7);
  });
  const start = () => {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = hook.result.current.runSimulation(); });
    return pending;
  };
  return { ...hook, options, run, completions, start };
}

describe("simulation session cancellation", () => {
  it.each(["account", "disconnect", "deployment", "close"] as const)("cancels on %s changes and rejects late results", async (change) => {
    const hook = await setup();
    const pending = hook.start();
    expect(hook.run).toHaveBeenCalledTimes(1);
    const signal = hook.run.mock.calls[0][0].signal;
    expect(signal?.aborted).toBe(false);
    if (change === "close") act(() => { hook.result.current.closeSimulation(); });
    else hook.rerender({ ...hook.options,
      walletAddress: change === "disconnect" ? null : change === "account" ? "0x222" : OWNER,
      deploymentKey: change === "deployment" ? "another-deployment" : KEY,
    });
    expect(signal?.aborted).toBe(true);
    await act(async () => { hook.completions[0](SUCCESS); await pending; });
    expect(hook.result.current.session.latestResult).toBeNull();
    expect(hook.result.current.session.status).not.toBe("running");
  });

  it("cancels the previous run and displays only the newest result", async () => {
    const hook = await setup();
    const first = hook.start();
    const firstSignal = hook.run.mock.calls[0][0].signal;
    const second = hook.start();
    expect(firstSignal?.aborted).toBe(true);
    await act(async () => { hook.completions[0](SUCCESS); await first; });
    expect(hook.result.current.session.latestResult).toBeNull();
    await act(async () => { hook.completions[1](SUCCESS); await second; });
    expect(hook.result.current.session.latestResult?.entries).toEqual(SUCCESS.entries);
  });

  it("cancels on unmount", async () => {
    const hook = await setup();
    const pending = hook.start();
    const signal = hook.run.mock.calls[0][0].signal;
    hook.unmount();
    expect(signal?.aborted).toBe(true);
    hook.completions[0](SUCCESS);
    await pending;
  });
});
