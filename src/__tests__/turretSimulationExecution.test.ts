import type { useSuiClient as useSuiClientHook } from "@mysten/dapp-kit";
import { describe, expect, it, vi } from "vitest";

import { createSimulationCandidateDraft, simulationDeploymentState } from "../test/turretSimulationFixtures";
import { createDevInspectErrorResponse, createDevInspectSuccessResponse } from "../test/turretSimulationMocks";
import { encodeSimulationPriorityEntries } from "../utils/turretSimulationCodec";
import { runTurretSimulation } from "../utils/turretSimulationExecution";

type SuiClient = ReturnType<typeof useSuiClientHook>;
type DevInspectTransactionBlock = SuiClient["devInspectTransactionBlock"];

describe("turretSimulationExecution", () => {
  it("builds the dev-inspect runtime path and decodes the returned priority list", async () => {
    const sender = "0x1111111111111111111111111111111111111111111111111111111111111111";
    const turretObjectId = "0x2222222222222222222222222222222222222222222222222222222222222222";
    const ownerCharacterId = "0x3333333333333333333333333333333333333333333333333333333333333333";
    const returnedBytes = encodeSimulationPriorityEntries([{
      targetItemId: "900001",
      priorityWeight: "120",
    }]);
    const devInspectTransactionBlock = vi.fn<DevInspectTransactionBlock>(() => Promise.resolve(createDevInspectSuccessResponse(Array.from(returnedBytes))));

    const result = await runTurretSimulation({
      candidate: createSimulationCandidateDraft({
        itemId: "900001",
        typeId: "900002",
        groupId: "25",
        characterId: 42,
        characterTribe: 7,
      }),
      deploymentState: simulationDeploymentState,
      ownerCharacterId,
      sender,
      suiClient: { devInspectTransactionBlock },
      turretObjectId,
    });

    expect(result.kind).toBe("success");

    if (result.kind !== "success") {
      throw new Error("Expected simulation success result.");
    }

    expect(result.entries).toEqual([{
      targetItemId: "900001",
      priorityWeight: "120",
    }]);
    expect(Array.from(result.rawReturnedBytes)).toEqual(Array.from(returnedBytes));

    expect(devInspectTransactionBlock).toHaveBeenCalledTimes(1);
    expect(devInspectTransactionBlock.mock.calls[0]?.[0]?.sender).toBe(sender);
  });

  it("classifies dev-inspect execution failures", async () => {
    await expect(runTurretSimulation({
      candidate: createSimulationCandidateDraft({
        itemId: "900001",
        typeId: "900002",
        groupId: "25",
        characterId: 42,
        characterTribe: 7,
      }),
      deploymentState: simulationDeploymentState,
      ownerCharacterId: "0xownercharacter",
      sender: "0xsender",
      suiClient: { devInspectTransactionBlock: vi.fn<DevInspectTransactionBlock>(() => Promise.resolve(createDevInspectErrorResponse("MoveAbort"))) },
      turretObjectId: "0x111",
    })).resolves.toEqual({
      kind: "execution-error",
      message: "Simulation execution failed in dev-inspect.",
      details: "MoveAbort",
    });
  });
});