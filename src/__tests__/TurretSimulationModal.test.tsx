import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TurretSimulationModal from "../components/TurretSimulationModal";
import { createSimulationCandidateDraft, createSimulationSession, simulationDeploymentState } from "../test/turretSimulationFixtures";

describe("TurretSimulationModal", () => {
  it("renders the selected turret and deployment context inside the simulation workspace", () => {
    render(
      <TurretSimulationModal
        onClose={() => undefined}
        onRefreshContext={() => undefined}
        session={createSimulationSession()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Perimeter Lancer" })).toBeVisible();
    expect(screen.getByText("Turret Simulation")).toBeVisible();
    expect(screen.getByText(simulationDeploymentState.packageId)).toBeVisible();
    expect(screen.getByText("Review the selected turret context before running a non-mutating extension simulation.")).toBeVisible();
  });

  it("shows a stale warning and refresh action when the session is stale", () => {
    const handleRefresh = vi.fn();

    render(
      <TurretSimulationModal
        onClose={() => undefined}
        onRefreshContext={handleRefresh}
          session={createSimulationSession({
          status: "stale",
          staleMessage: "Deployment context changed.",
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Deployment context changed.");

    fireEvent.click(screen.getByRole("button", { name: "Refresh Context" }));

    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it("forwards the close action", () => {
    const handleClose = vi.fn();

    render(
      <TurretSimulationModal
        onClose={handleClose}
        onRefreshContext={() => undefined}
          session={createSimulationSession()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders hydrated draft fields with visible provenance and forwards manual overrides", () => {
    const handleUpdateField = vi.fn();

    render(
      <TurretSimulationModal
        onClose={() => undefined}
        onRefreshContext={() => undefined}
        onUpdateField={handleUpdateField}
        session={createSimulationSession({
          draft: {
            candidate: createSimulationCandidateDraft({
              itemId: "900001",
              typeId: "900002",
              hpRatio: "85",
            }),
            fieldSources: {
              itemId: "remote-suggestion",
              typeId: "remote-suggestion",
              groupId: "default",
              characterId: "default",
              characterTribe: "default",
              hpRatio: "manual",
              shieldRatio: "default",
              armorRatio: "default",
              isAggressor: "default",
              priorityWeight: "default",
              behaviourChange: "default",
            },
            isComplete: false,
            lastHydratedAt: 1,
          },
          fieldErrors: {
            characterId: "Character id must be a non-negative integer within u32 range.",
          },
          ownerCharacterId: "0xowner",
        })}
      />,
    );

    expect(screen.getByDisplayValue("900001")).toBeVisible();
    expect(screen.getByDisplayValue("85")).toBeVisible();
    expect(screen.getAllByText("Suggested").length).toBeGreaterThan(0);
    expect(screen.getByText("Character id must be a non-negative integer within u32 range.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("HP Ratio"), { target: { value: "80" } });

    expect(handleUpdateField).toHaveBeenCalledWith("hpRatio", "80");
  });

  it("applies remote suggestions from the lookup panel", () => {
    const handleApplySuggestion = vi.fn();

    render(
      <TurretSimulationModal
        onApplySuggestion={handleApplySuggestion}
        onClose={() => undefined}
        onRefreshContext={() => undefined}
        session={createSimulationSession({
          suggestionState: {
            activeField: "itemId",
            errorMessage: null,
            isLoading: false,
            query: "0xabc123",
            suggestions: [{
              field: "itemId",
              label: "Hostile Frigate",
              value: "900001",
              description: "Type 900002 · Group 25 · Character 99 · Tribe 12",
              derivedFields: {
                itemId: "900001",
                typeId: "900002",
                groupId: "25",
                characterId: 99,
                characterTribe: 12,
              },
              sourceObjectId: "0xabc123",
            }],
          },
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Hostile Frigate/i }));

    expect(handleApplySuggestion).toHaveBeenCalledTimes(1);
  });

  it("renders successful simulation results and execution errors", () => {
    const { rerender } = render(
      <TurretSimulationModal
        onClose={() => undefined}
        onRefreshContext={() => undefined}
        session={createSimulationSession({
          latestResult: {
            kind: "success",
            entries: [{
              targetItemId: "900001",
              priorityWeight: "120",
            }],
            rawReturnedBytes: new Uint8Array([1, 2, 3]),
            executedAt: 1,
          },
        })}
      />,
    );

    expect(screen.getByText("Simulation Results")).toBeVisible();
    expect(screen.getByRole("cell", { name: "120" })).toBeVisible();

    rerender(
      <TurretSimulationModal
        onClose={() => undefined}
        onRefreshContext={() => undefined}
        session={createSimulationSession({
          latestError: {
            kind: "execution",
            message: "Simulation execution failed in dev-inspect.",
            details: "MoveAbort",
            failedAt: 2,
          },
        })}
      />,
    );

    expect(screen.getByText("Simulation Error")).toBeVisible();
    expect(screen.getByText("MoveAbort")).toBeVisible();
  });
});