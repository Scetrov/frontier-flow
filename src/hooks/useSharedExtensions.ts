import { useCallback, useEffect, useMemo, useState } from "react";

import { resolveSharedAuthorizationContract } from "./useAuthorizationContracts";
import {
  SHARED_EXTENSION_CHANGE_EVENT,
  addSharedExtension,
  loadSharedExtensions,
  removeSharedExtension,
  saveSharedExtensions,
  type SharedExtension,
} from "../utils/sharedExtensionStorage";

export interface SharedExtensionControls {
  readonly extensions: readonly SharedExtension[];
  readonly onAdd: (packageId: string, targetId: SharedExtension["targetId"]) => Promise<void>;
  readonly onRemove: (key: string) => void;
}

function browserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

/**
 * Tracks extensions published by other players that this wallet opted into.
 * Authorization only needs the package id and module name, so a turret owner
 * can point at a shared contract without ever republishing it.
 */
export function useSharedExtensions(): SharedExtensionControls {
  const [extensions, setExtensions] = useState<readonly SharedExtension[]>(() => loadSharedExtensions(browserStorage()));

  const onAdd = useCallback(async (packageId: string, targetId: SharedExtension["targetId"]) => {
    const resolved = await resolveSharedAuthorizationContract({ packageId, targetId });
    setExtensions((current) => {
      const next = addSharedExtension(current, { ...resolved, targetId });
      saveSharedExtensions(browserStorage(), next);
      return next;
    });
  }, []);

  const onRemove = useCallback((key: string) => {
    setExtensions((current) => {
      const next = removeSharedExtension(current, key);
      saveSharedExtensions(browserStorage(), next);
      return next;
    });
  }, []);

  return useMemo(() => ({ extensions, onAdd, onRemove }), [extensions, onAdd, onRemove]);
}

/** True when at least one shared extension is saved; stays in sync across views. */
export function useHasSharedExtensions(): boolean {
  const [hasAny, setHasAny] = useState(() => loadSharedExtensions(browserStorage()).length > 0);

  useEffect(() => {
    const sync = () => { setHasAny(loadSharedExtensions(browserStorage()).length > 0); };
    window.addEventListener(SHARED_EXTENSION_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SHARED_EXTENSION_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return hasAny;
}
