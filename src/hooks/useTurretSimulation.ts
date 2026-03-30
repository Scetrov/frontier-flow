import type { useSuiClient as useSuiClientHook } from "@mysten/dapp-kit";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";

import type { StoredDeploymentState, TurretInfo } from "../types/authorization";
import {
  createEmptySimulationReferenceData,
  createEmptySimulationSuggestionState,
  createClosedTurretSimulationSession,
  createEmptySimulationInputDraft,
  type OpenTurretSimulationInput,
  type SimulationCandidateDraft,
  type SimulationCharacterOption,
  type SimulationFieldKey,
  type SimulationFieldSource,
  type SimulationFieldSourceMap,
  type SimulationFieldValue,
  type SimulationReferenceDataPayload,
  type SimulationShipOption,
  type SimulationSuggestion,
  type TurretSimulationSession,
  type UseTurretSimulationResult,
} from "../types/turretSimulation";
import { formatAddress } from "../utils/formatAddress";
import { fetchSimulationOwnerCharacterId } from "../utils/authorizationTransaction";
import { runTurretSimulation } from "../utils/turretSimulationExecution";
import { fetchSimulationSuggestions } from "../utils/turretSimulationQueries";
import { loadSimulationReferenceData } from "../utils/turretSimulationReferenceData";
import { isSimulationDraftComplete, validateSimulationDraft } from "../utils/turretSimulationValidation";

type SuiClient = ReturnType<typeof useSuiClientHook>;

interface UseTurretSimulationOptions {
  readonly deploymentKey: string | null;
  readonly deploymentState: StoredDeploymentState | null;
  readonly turrets: readonly TurretInfo[];
  readonly walletAddress: string | null;
  readonly fetchSimulationOwnerCharacterIdFn?: typeof fetchSimulationOwnerCharacterId;
  readonly fetchSimulationSuggestionsFn?: typeof fetchSimulationSuggestions;
  readonly loadSimulationReferenceDataFn?: typeof loadSimulationReferenceData;
  readonly runTurretSimulationFn?: typeof runTurretSimulation;
  readonly suiClient: Pick<SuiClient, "devInspectTransactionBlock">;
}

type SessionStateSetter = Dispatch<SetStateAction<TurretSimulationSession>>;

interface DraftHydrationAccumulator {
  readonly candidate: SimulationCandidateDraft;
  readonly fieldSources: SimulationFieldSourceMap;
  readonly hasUpdates: boolean;
}

function getTurretTitle(turret: TurretInfo): string {
  return turret.displayName ?? formatAddress(turret.objectId);
}

function getResolvedSession(input: {
  readonly deploymentKey: string | null;
  readonly deploymentState: StoredDeploymentState | null;
  readonly session: TurretSimulationSession;
  readonly turrets: readonly TurretInfo[];
}): TurretSimulationSession {
  const { deploymentKey, deploymentState, session, turrets } = input;

  if (session.status === "closed") {
    return session;
  }

  const staleDeploymentSession = getDeploymentStaleSession({ deploymentKey, deploymentState, session });

  if (staleDeploymentSession !== null) {
    return staleDeploymentSession;
  }

  const currentTurret = turrets.find((turret) => turret.objectId === session.turretObjectId) ?? null;

  if (currentTurret === null) {
    return createStaleSession(session, "Selected turret is no longer available. Refresh the turret roster or reopen this simulation.");
  }

  if ((currentTurret.currentExtension?.typeName ?? null) !== session.openedExtensionTypeName) {
    return createStaleSession(
      session,
      "Selected turret changed extension state while the modal was open. Refresh the turret roster or reopen this simulation.",
      {
        turret: currentTurret,
        turretTitle: getTurretTitle(currentTurret),
      },
    );
  }

  return {
    ...session,
    status: session.status === "running" ? "running" : "editing",
    deploymentState,
    staleMessage: null,
    turret: currentTurret,
    turretTitle: getTurretTitle(currentTurret),
  };
}

function createStaleSession(
  session: TurretSimulationSession,
  staleMessage: string,
  overrides: Partial<TurretSimulationSession> = {},
): TurretSimulationSession {
  return {
    ...session,
    ...overrides,
    status: "stale",
    staleMessage,
  };
}

function getDeploymentStaleSession(input: {
  readonly deploymentKey: string | null;
  readonly deploymentState: StoredDeploymentState | null;
  readonly session: TurretSimulationSession;
}): TurretSimulationSession | null {
  const { deploymentKey, deploymentState, session } = input;

  if (deploymentKey !== null && deploymentState !== null && session.deploymentKey === deploymentKey) {
    return null;
  }

  return createStaleSession(
    session,
    "Deployment context changed. Refresh the turret roster or reopen this simulation with the current deployment.",
  );
}

function getDraftState(input: {
  readonly candidate: SimulationCandidateDraft;
  readonly fieldSources: SimulationFieldSourceMap;
  readonly ownerCharacterId: string | null;
}): TurretSimulationSession["draft"] {
  return {
    candidate: input.candidate,
    fieldSources: input.fieldSources,
    isComplete: isSimulationDraftComplete({
      candidate: input.candidate,
      ownerCharacterId: input.ownerCharacterId,
    }),
    lastHydratedAt: Date.now(),
  };
}

function coerceSuggestionFields(suggestion: SimulationSuggestion): Partial<SimulationCandidateDraft> {
  if (Object.keys(suggestion.derivedFields).length > 0) {
    return suggestion.derivedFields;
  }

  if (suggestion.field === "characterId" || suggestion.field === "characterTribe") {
    return {
      [suggestion.field]: Number(suggestion.value),
    } as Pick<SimulationCandidateDraft, "characterId" | "characterTribe">;
  }

  return {
    [suggestion.field]: suggestion.value,
  } as Partial<SimulationCandidateDraft>;
}

function getNextFieldSources(
  fieldSources: SimulationFieldSourceMap,
  updates: Partial<SimulationCandidateDraft>,
  source: SimulationFieldSource,
): SimulationFieldSourceMap {
  const nextFieldSources = { ...fieldSources };

  for (const key of Object.keys(updates) as SimulationFieldKey[]) {
    nextFieldSources[key] = source;
  }

  return nextFieldSources;
}

function updateDraftSession(
  currentSession: TurretSimulationSession,
  input: {
    readonly candidate: SimulationCandidateDraft;
    readonly fieldSources: SimulationFieldSourceMap;
    readonly ownerCharacterId?: string | null;
  },
): Pick<TurretSimulationSession, "draft" | "fieldErrors"> {
  const ownerCharacterId = input.ownerCharacterId ?? currentSession.ownerCharacterId;
  const validation = validateSimulationDraft({
    candidate: input.candidate,
    ownerCharacterId,
  });

  return {
    draft: getDraftState({
      candidate: input.candidate,
      fieldSources: input.fieldSources,
      ownerCharacterId,
    }),
    fieldErrors: validation.fieldErrors,
  };
}

function createOpenSimulationSession(input: {
  readonly deploymentKey: string;
  readonly deploymentState: StoredDeploymentState;
  readonly turret: TurretInfo;
  readonly walletAddress: string | null;
}): TurretSimulationSession {
  return {
    status: "editing",
    candidateLookupQuery: "",
    deploymentKey: input.deploymentKey,
    deploymentState: input.deploymentState,
    draft: createEmptySimulationInputDraft(),
    fieldErrors: {},
    isHydratingOwnerCharacter: input.walletAddress !== null && input.deploymentState.targetId !== "local",
    latestError: null,
    latestResult: null,
    openedAt: Date.now(),
    openedExtensionTypeName: input.turret.currentExtension?.typeName ?? null,
    ownerCharacterErrorMessage: input.walletAddress === null ? "Connect a Sui wallet to resolve the turret owner character." : null,
    ownerCharacterId: null,
    staleMessage: null,
    suggestionState: createEmptySimulationSuggestionState(),
    turret: input.turret,
    turretObjectId: input.turret.objectId,
    turretTitle: getTurretTitle(input.turret),
  };
}

function hydrateDraftFromReferenceData(
  currentSession: TurretSimulationSession,
  referenceData: Pick<SimulationReferenceDataPayload, "characterOptions" | "shipOptions">,
): TurretSimulationSession {
  if (currentSession.status === "closed") {
    return currentSession;
  }

  const hydratedDraft = hydrateCharacterFields(
    hydrateShipFields(
      createDraftHydrationAccumulator(currentSession),
      getSelectedShipOption(referenceData.shipOptions, currentSession.draft.candidate.typeId),
    ),
    getSelectedCharacterOption(referenceData.characterOptions, currentSession.draft.candidate.characterId),
  );

  if (!hydratedDraft.hasUpdates) {
    return currentSession;
  }

  return {
    ...currentSession,
    ...updateDraftSession(currentSession, {
      candidate: hydratedDraft.candidate,
      fieldSources: hydratedDraft.fieldSources,
    }),
  };
}

function createDraftHydrationAccumulator(session: TurretSimulationSession): DraftHydrationAccumulator {
  return {
    candidate: session.draft.candidate,
    fieldSources: session.draft.fieldSources,
    hasUpdates: false,
  };
}

function applyHydratedField<TKey extends SimulationFieldKey>(
  accumulator: DraftHydrationAccumulator,
  key: TKey,
  value: SimulationFieldValue<TKey>,
  source: SimulationFieldSource,
): DraftHydrationAccumulator {
  return {
    candidate: {
      ...accumulator.candidate,
      [key]: value,
    },
    fieldSources: {
      ...accumulator.fieldSources,
      [key]: source,
    },
    hasUpdates: true,
  };
}

function hydrateShipFields(
  accumulator: DraftHydrationAccumulator,
  selectedShip: SimulationShipOption | null,
): DraftHydrationAccumulator {
  if (selectedShip === null) {
    return accumulator;
  }

  let nextAccumulator = accumulator;

  if (nextAccumulator.fieldSources.typeId === "default" && nextAccumulator.candidate.typeId.trim().length === 0) {
    nextAccumulator = applyHydratedField(nextAccumulator, "typeId", selectedShip.typeId, "world-api");
  }

  if (
    (nextAccumulator.fieldSources.groupId === "default" || nextAccumulator.fieldSources.groupId === "world-api")
    && nextAccumulator.candidate.groupId !== selectedShip.groupId
  ) {
    nextAccumulator = applyHydratedField(nextAccumulator, "groupId", selectedShip.groupId, "world-api");
  }

  return nextAccumulator;
}

function hydrateCharacterFields(
  accumulator: DraftHydrationAccumulator,
  selectedCharacter: SimulationCharacterOption | null,
): DraftHydrationAccumulator {
  if (selectedCharacter === null) {
    return accumulator;
  }

  let nextAccumulator = accumulator;

  if (nextAccumulator.fieldSources.characterId === "default" && nextAccumulator.candidate.characterId === null) {
    nextAccumulator = applyHydratedField(nextAccumulator, "characterId", selectedCharacter.characterId, "graphql");
  }

  if (
    selectedCharacter.characterTribe !== null
    && (nextAccumulator.fieldSources.characterTribe === "default" || nextAccumulator.fieldSources.characterTribe === "graphql")
    && nextAccumulator.candidate.characterTribe !== selectedCharacter.characterTribe
  ) {
    nextAccumulator = applyHydratedField(nextAccumulator, "characterTribe", selectedCharacter.characterTribe, "graphql");
  }

  return nextAccumulator;
}

function getSelectedShipOption(
  shipOptions: readonly SimulationShipOption[],
  currentTypeId: string,
): SimulationShipOption | null {
  if (shipOptions.length === 0) {
    return null;
  }

  return shipOptions.find((option) => option.typeId === currentTypeId) ?? shipOptions[0];
}

function getSelectedCharacterOption(
  characterOptions: readonly SimulationCharacterOption[],
  currentCharacterId: number | null,
): SimulationCharacterOption | null {
  if (characterOptions.length === 0) {
    return null;
  }

  return characterOptions.find((option) => option.characterId === currentCharacterId) ?? characterOptions[0];
}

function useOwnerCharacterHydrationEffect(input: {
  readonly fetchSimulationOwnerCharacterIdFn: typeof fetchSimulationOwnerCharacterId;
  readonly session: TurretSimulationSession;
  readonly setSession: SessionStateSetter;
  readonly walletAddress: string | null;
}) {
  const { fetchSimulationOwnerCharacterIdFn, session, setSession, walletAddress } = input;

  useEffect(() => {
    if (session.status === "closed" || session.deploymentState === null || session.turretObjectId === null) {
      return;
    }

    if (!session.isHydratingOwnerCharacter || walletAddress === null || session.deploymentState.targetId === "local") {
      return;
    }

    let isActive = true;

    void fetchSimulationOwnerCharacterIdFn({
      deploymentState: session.deploymentState,
      turretObjectId: session.turretObjectId,
      walletAddress,
    }).then((ownerCharacterId) => {
      if (!isActive) {
        return;
      }

      setSession((currentSession) => currentSession.status === "closed"
        ? currentSession
        : {
            ...currentSession,
            ...updateDraftSession(currentSession, {
              candidate: currentSession.draft.candidate,
              fieldSources: currentSession.draft.fieldSources,
              ownerCharacterId,
            }),
            isHydratingOwnerCharacter: false,
            ownerCharacterErrorMessage: null,
            ownerCharacterId,
          });
    }).catch((error: unknown) => {
      if (!isActive) {
        return;
      }

      setSession((currentSession) => currentSession.status === "closed"
        ? currentSession
        : {
            ...currentSession,
            draft: getDraftState({
              candidate: currentSession.draft.candidate,
              fieldSources: currentSession.draft.fieldSources,
              ownerCharacterId: null,
            }),
            isHydratingOwnerCharacter: false,
            ownerCharacterErrorMessage: error instanceof Error ? error.message : "Could not resolve the turret owner character.",
          });
    });

    return () => {
      isActive = false;
    };
  }, [fetchSimulationOwnerCharacterIdFn, session.deploymentState, session.isHydratingOwnerCharacter, session.status, session.turretObjectId, setSession, walletAddress]);
}

function useSuggestionLoader(input: {
  readonly fetchSimulationSuggestionsFn: typeof fetchSimulationSuggestions;
  readonly resolvedSession: TurretSimulationSession;
  readonly setSession: SessionStateSetter;
  readonly walletAddress: string | null;
}) {
  const { fetchSimulationSuggestionsFn, resolvedSession, setSession, walletAddress } = input;

  return useCallback(async (field: SimulationFieldKey, query?: string) => {
    if (resolvedSession.status === "closed" || resolvedSession.deploymentState === null || resolvedSession.turretObjectId === null || walletAddress === null) {
      return;
    }

    const lookupQuery = query ?? resolvedSession.candidateLookupQuery;

    setSession((currentSession) => currentSession.status === "closed"
      ? currentSession
      : {
          ...currentSession,
          candidateLookupQuery: lookupQuery,
          suggestionState: {
            activeField: field,
            errorMessage: null,
            isLoading: true,
            query: lookupQuery,
            suggestions: [],
          },
        });

    try {
      const result = await fetchSimulationSuggestionsFn({
        deploymentState: resolvedSession.deploymentState,
        turretObjectId: resolvedSession.turretObjectId,
        walletAddress,
        ownerCharacterId: resolvedSession.ownerCharacterId,
        query: lookupQuery,
        field,
      });

      setSession((currentSession) => {
        if (currentSession.status === "closed") {
          return currentSession;
        }

        const nextTurret = result.refreshedTurret ?? currentSession.turret;

        return {
          ...currentSession,
          suggestionState: {
            activeField: field,
            errorMessage: result.suggestions.length === 0 ? "No remote suggestions matched this query." : null,
            isLoading: false,
            query: lookupQuery,
            suggestions: result.suggestions,
          },
          turret: nextTurret,
          turretTitle: nextTurret === null ? currentSession.turretTitle : getTurretTitle(nextTurret),
        };
      });
    } catch (error: unknown) {
      setSession((currentSession) => currentSession.status === "closed"
        ? currentSession
        : {
            ...currentSession,
            suggestionState: {
              activeField: field,
              errorMessage: error instanceof Error ? error.message : "Could not load remote suggestions.",
              isLoading: false,
              query: lookupQuery,
              suggestions: [],
            },
          });
    }
  }, [fetchSimulationSuggestionsFn, resolvedSession, setSession, walletAddress]);
}

function useSimulationRunner(input: {
  readonly resolvedSession: TurretSimulationSession;
  readonly runTurretSimulationFn: typeof runTurretSimulation;
  readonly setSession: SessionStateSetter;
  readonly suiClient: Pick<SuiClient, "devInspectTransactionBlock">;
  readonly walletAddress: string | null;
}) {
  const { resolvedSession, runTurretSimulationFn, setSession, suiClient, walletAddress } = input;

  return useCallback(async () => {
    if (resolvedSession.status === "closed" || resolvedSession.deploymentState === null || resolvedSession.turretObjectId === null) {
      return;
    }

    const blockingError = getSimulationBlockingError(resolvedSession, walletAddress);

    if (blockingError !== null) {
      setSession((currentSession) => currentSession.status === "closed"
        ? currentSession
        : { ...currentSession, ...blockingError });
      return;
    }

    setSession((currentSession) => currentSession.status === "closed"
      ? currentSession
      : { ...currentSession, status: "running", latestError: null });

    const result = await runTurretSimulationFn({
      candidate: resolvedSession.draft.candidate,
      deploymentState: resolvedSession.deploymentState,
      ownerCharacterId: resolvedSession.ownerCharacterId as string,
      sender: walletAddress as string,
      suiClient,
      turretObjectId: resolvedSession.turretObjectId,
    });

    setSession((currentSession) => currentSession.status === "closed"
      ? currentSession
      : applySimulationResult(currentSession, result));
  }, [resolvedSession, runTurretSimulationFn, setSession, suiClient, walletAddress]);
}

function getSimulationBlockingError(
  resolvedSession: TurretSimulationSession,
  walletAddress: string | null,
): Pick<TurretSimulationSession, "fieldErrors" | "latestError"> | null {
  if (resolvedSession.status === "stale") {
    return {
      fieldErrors: resolvedSession.fieldErrors,
      latestError: {
        kind: "stale-context",
        message: resolvedSession.staleMessage ?? "Refresh the simulation context before rerunning.",
        details: null,
        failedAt: Date.now(),
      },
    };
  }

  if (walletAddress === null) {
    return {
      fieldErrors: resolvedSession.fieldErrors,
      latestError: {
        kind: "lookup",
        message: "Connect a Sui wallet before running a simulation.",
        details: null,
        failedAt: Date.now(),
      },
    };
  }

  const validation = validateSimulationDraft({
    candidate: resolvedSession.draft.candidate,
    ownerCharacterId: resolvedSession.ownerCharacterId,
  });

  if (validation.isValid) {
    return null;
  }

  return {
    fieldErrors: validation.fieldErrors,
    latestError: {
      kind: resolvedSession.ownerCharacterId === null ? "lookup" : "validation",
      message: resolvedSession.ownerCharacterId === null
        ? (resolvedSession.ownerCharacterErrorMessage ?? "Resolve the turret owner character before running a simulation.")
        : "Complete the required simulation fields before running a simulation.",
      details: null,
      failedAt: Date.now(),
    },
  };
}

function applySimulationResult(
  currentSession: TurretSimulationSession,
  result: Awaited<ReturnType<typeof runTurretSimulation>>,
): TurretSimulationSession {
  if (result.kind === "success") {
    return {
      ...currentSession,
      status: "editing",
      latestError: null,
      latestResult: {
        ...result,
        executedAt: Date.now(),
      },
    };
  }

  return {
    ...currentSession,
    status: "editing",
    latestError: {
      kind: "execution",
      message: result.message,
      details: result.details ?? null,
      failedAt: Date.now(),
    },
  };
}

function useSimulationLifecycle(input: {
  readonly setSession: SessionStateSetter;
  readonly walletAddress: string | null;
}) {
  const { setSession, walletAddress } = input;

  const closeSimulation = useCallback(() => {
    setSession(createClosedTurretSimulationSession());
  }, [setSession]);

  const openSimulation = useCallback((openInput: OpenTurretSimulationInput) => {
    setSession(createOpenSimulationSession({ ...openInput, walletAddress }));
  }, [setSession, walletAddress]);

  return { closeSimulation, openSimulation };
}

function useDraftFieldUpdater(setSession: SessionStateSetter) {
  return useCallback(<TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => {
    setSession((currentSession) => {
      if (currentSession.status === "closed") {
        return currentSession;
      }

      const candidate = {
        ...currentSession.draft.candidate,
        [key]: value,
      } as SimulationCandidateDraft;
      const fieldSources = getNextFieldSources(currentSession.draft.fieldSources, { [key]: value } as Pick<SimulationCandidateDraft, TKey>, "manual");

      return {
        ...currentSession,
        ...updateDraftSession(currentSession, { candidate, fieldSources }),
      };
    });
  }, [setSession]);
}

function useLookupQuerySetter(setSession: SessionStateSetter) {
  return useCallback((value: string) => {
    setSession((currentSession) => currentSession.status === "closed"
      ? currentSession
      : {
          ...currentSession,
          candidateLookupQuery: value,
          suggestionState: {
            ...currentSession.suggestionState,
            query: value,
          },
        });
  }, [setSession]);
}

function useSuggestionApplier(setSession: SessionStateSetter) {
  return useCallback((suggestion: SimulationSuggestion) => {
    setSession((currentSession) => {
      if (currentSession.status === "closed") {
        return currentSession;
      }

      const updates = coerceSuggestionFields(suggestion);
      const candidate = {
        ...currentSession.draft.candidate,
        ...updates,
      };
      const fieldSources = getNextFieldSources(currentSession.draft.fieldSources, updates, "remote-suggestion");

      return {
        ...currentSession,
        ...updateDraftSession(currentSession, { candidate, fieldSources }),
        suggestionState: {
          ...currentSession.suggestionState,
          errorMessage: null,
          suggestions: [],
        },
      };
    });
  }, [setSession]);
}

function useContextRefresher(input: {
  readonly setSession: SessionStateSetter;
  readonly walletAddress: string | null;
}) {
  const { setSession, walletAddress } = input;

  return useCallback(async () => {
    setSession((currentSession) => {
      if (currentSession.status === "closed") {
        return currentSession;
      }

      return {
        ...currentSession,
        draft: getDraftState({
          candidate: currentSession.draft.candidate,
          fieldSources: currentSession.draft.fieldSources,
          ownerCharacterId: null,
        }),
        fieldErrors: {},
        isHydratingOwnerCharacter: walletAddress !== null && currentSession.deploymentState?.targetId !== "local",
        ownerCharacterErrorMessage: null,
        ownerCharacterId: null,
        suggestionState: createEmptySimulationSuggestionState(),
      };
    });

    await Promise.resolve();
  }, [setSession, walletAddress]);
}

function useSimulationReferenceDataState(input: {
  readonly loadSimulationReferenceDataFn: typeof loadSimulationReferenceData;
  readonly setSession: SessionStateSetter;
  readonly session: TurretSimulationSession;
  readonly walletAddress: string | null;
}) {
  const { loadSimulationReferenceDataFn, setSession, session, walletAddress } = input;
  const [referenceData, setReferenceData] = useState(createEmptySimulationReferenceData);
  const { closeSimulation: baseCloseSimulation, openSimulation: baseOpenSimulation } = useSimulationLifecycle({ setSession, walletAddress });

  const openSimulation = useCallback((openInput: OpenTurretSimulationInput) => {
    setReferenceData({
      ...createEmptySimulationReferenceData(),
      isLoading: true,
    });
    baseOpenSimulation(openInput);
  }, [baseOpenSimulation]);

  const closeSimulation = useCallback(() => {
    setReferenceData(createEmptySimulationReferenceData());
    baseCloseSimulation();
  }, [baseCloseSimulation]);

  useEffect(() => {
    if (session.status === "closed") {
      return;
    }

    let isActive = true;

    void loadSimulationReferenceDataFn({
      deploymentState: session.deploymentState,
      walletAddress,
    }).then((loadedReferenceData) => {
      if (!isActive) {
        return;
      }

      setReferenceData({
        characterOptions: loadedReferenceData.characterOptions,
        isLoading: false,
        loadErrorMessage: loadedReferenceData.errorMessages[0] ?? null,
        shipOptions: loadedReferenceData.shipOptions,
        tribeOptions: loadedReferenceData.tribeOptions,
      });
      setSession((currentSession) => hydrateDraftFromReferenceData(currentSession, loadedReferenceData));
    }).catch((error: unknown) => {
      if (!isActive) {
        return;
      }

      setReferenceData({
        characterOptions: [],
        isLoading: false,
        loadErrorMessage: error instanceof Error ? error.message : "Could not load simulation reference data.",
        shipOptions: [],
        tribeOptions: [],
      });
    });

    return () => {
      isActive = false;
    };
  }, [loadSimulationReferenceDataFn, session.deploymentState, session.openedAt, session.status, setSession, walletAddress]);

  return {
    closeSimulation,
    openSimulation,
    referenceData,
  };
}

/**
 * Keep authorize workflow simulation state synchronized with the live deployment context.
 */
export function useTurretSimulation({
  deploymentKey,
  deploymentState,
  turrets,
  walletAddress,
  fetchSimulationOwnerCharacterIdFn = fetchSimulationOwnerCharacterId,
  fetchSimulationSuggestionsFn = fetchSimulationSuggestions,
  loadSimulationReferenceDataFn = loadSimulationReferenceData,
  runTurretSimulationFn = runTurretSimulation,
  suiClient,
}: UseTurretSimulationOptions): UseTurretSimulationResult {
  const [session, setSession] = useState<TurretSimulationSession>(() => createClosedTurretSimulationSession());

  const resolvedSession = useMemo(() => getResolvedSession({
    deploymentKey,
    deploymentState,
    session,
    turrets,
  }), [deploymentKey, deploymentState, session, turrets]);

  const { closeSimulation, openSimulation, referenceData } = useSimulationReferenceDataState({
    loadSimulationReferenceDataFn,
    session,
    setSession,
    walletAddress,
  });

  useOwnerCharacterHydrationEffect({
    fetchSimulationOwnerCharacterIdFn,
    session,
    setSession,
    walletAddress,
  });

  const updateField = useDraftFieldUpdater(setSession);
  const setLookupQuery = useLookupQuerySetter(setSession);

  const loadSuggestions = useSuggestionLoader({
    fetchSimulationSuggestionsFn,
    resolvedSession,
    setSession,
    walletAddress,
  });

  const applySuggestion = useSuggestionApplier(setSession);
  const refreshContext = useContextRefresher({ setSession, walletAddress });

  const runSimulation = useSimulationRunner({
    resolvedSession,
    runTurretSimulationFn,
    setSession,
    suiClient,
    walletAddress,
  });

  return {
    applySuggestion,
    closeSimulation,
    isOpen: resolvedSession.status !== "closed",
    loadSuggestions,
    openSimulation,
    referenceData,
    refreshContext,
    runSimulation,
    setLookupQuery,
    session: resolvedSession,
    updateField,
  };
}