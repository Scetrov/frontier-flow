import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TurretSimulationModal from "../components/TurretSimulationModal";
import { createEmptySimulationReferenceData } from "../types/turretSimulation";
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
    expect(screen.getByText("Ship Identity")).toBeVisible();
    expect(screen.getByText("Pilot Identity")).toBeVisible();
    expect(screen.getByText("Miscellaneous")).toBeVisible();
    expect(screen.getByLabelText("Item Id")).toBeVisible();
    expect(screen.queryByLabelText("Candidate lookup query")).not.toBeInTheDocument();
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
        closeLabel="Close"
        onClose={handleClose}
        onRefreshContext={() => undefined}
          session={createSimulationSession()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not render a close action when no close label is provided", () => {
    render(
      <TurretSimulationModal
        onClose={() => undefined}
        onRefreshContext={() => undefined}
        session={createSimulationSession()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
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

  it("applies remote character suggestions from the grouped pilot identity field", () => {
    const handleApplySuggestion = vi.fn();

    render(
      <TurretSimulationModal
        onApplySuggestion={handleApplySuggestion}
        onClose={() => undefined}
        onRefreshContext={() => undefined}
        onLoadSuggestions={() => undefined}
        session={createSimulationSession({
          suggestionState: {
            activeField: "characterId",
            errorMessage: null,
            isLoading: false,
            query: "Pilot",
            suggestions: [{
              field: "characterId",
              label: "Pilot Prime (42)",
              value: "42",
              description: "Name Pilot Prime · Tribe 7",
              derivedFields: {
                characterId: 42,
                characterTribe: 7,
              },
              sourceObjectId: "0xcafe42",
            }],
          },
        })}
      />,
    );

    fireEvent.focus(screen.getByLabelText("Character Id"));
    fireEvent.change(screen.getByLabelText("Character Id"), { target: { value: "Pilot" } });

    fireEvent.click(screen.getByRole("button", { name: /Pilot Prime/i }));

    expect(handleApplySuggestion).toHaveBeenCalledTimes(1);
  });

  it("shows the selected character under the field without rendering a redundant known-characters select", () => {
    render(
      <TurretSimulationModal
        onClose={() => undefined}
        onRefreshContext={() => undefined}
        referenceData={{
          ...createEmptySimulationReferenceData(),
          characterOptions: [{
            characterId: 42,
            characterTribe: 7,
            description: "Tenant utopia · Tribe 7",
            label: "Pilot Prime (42)",
            sourceObjectId: "0xcafe42",
          }],
        }}
        session={createSimulationSession({
          draft: {
            candidate: createSimulationCandidateDraft({
              characterId: 42,
              characterTribe: 7,
            }),
            fieldSources: {
              itemId: "default",
              typeId: "default",
              groupId: "default",
              characterId: "graphql",
              characterTribe: "graphql",
              hpRatio: "default",
              shieldRatio: "default",
              armorRatio: "default",
              isAggressor: "default",
              priorityWeight: "default",
              behaviourChange: "default",
            },
            isComplete: false,
            lastHydratedAt: 1,
          },
        })}
      />,
    );

    expect(screen.getByText("Pilot Prime (42) · Tenant utopia · Tribe 7")).toBeVisible();
    expect(screen.queryByLabelText("Known Character Ids")).not.toBeInTheDocument();
  });

  it("debounces character autocomplete requests while typing", () => {
    vi.useFakeTimers();
    const handleLoadSuggestions = vi.fn();

    try {
      const { rerender } = render(
        <TurretSimulationModal
          onClose={() => undefined}
          onLoadSuggestions={handleLoadSuggestions}
          onRefreshContext={() => undefined}
          session={createSimulationSession()}
        />,
      );

      fireEvent.focus(screen.getByLabelText("Character Id"));

      fireEvent.change(screen.getByLabelText("Character Id"), { target: { value: "Pilot" } });

      expect(handleLoadSuggestions).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(249);
      });

      expect(handleLoadSuggestions).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(handleLoadSuggestions).toHaveBeenCalledWith("characterId", "Pilot");

      rerender(
        <TurretSimulationModal
          onClose={() => undefined}
          onLoadSuggestions={vi.fn()}
          onRefreshContext={() => undefined}
          session={createSimulationSession({
            suggestionState: {
              activeField: "characterId",
              errorMessage: null,
              isLoading: false,
              query: "Pilot",
              suggestions: [{
                field: "characterId",
                label: "Pilot Prime (42)",
                value: "42",
                description: "Name Pilot Prime · Tribe 7",
                derivedFields: {
                  characterId: 42,
                  characterTribe: 7,
                },
                sourceObjectId: "0xcafe42",
              }],
            },
          })}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(handleLoadSuggestions).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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