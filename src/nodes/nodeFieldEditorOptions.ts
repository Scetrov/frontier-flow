interface WorldApiCollectionResponse<T> {
  readonly data?: readonly T[];
}

export interface SelectableOption {
  readonly value: number;
  readonly label: string;
  readonly description?: string;
}

const optionCache = new Map<string, readonly SelectableOption[]>();

/**
 * Clear cached option responses so isolated tests can control remote-data fixtures.
 */
export function resetNodeFieldEditorOptionCacheForTests(): void {
  optionCache.clear();
}

function isSelectableRecord(value: unknown): value is { readonly id: number; readonly name: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as { readonly id?: unknown; readonly name?: unknown };
  return typeof record.id === "number" && Number.isFinite(record.id) && typeof record.name === "string";
}

/**
 * Build a selectable tribe option from untrusted World API data.
 */
export function buildTribeOption(value: unknown): SelectableOption | null {
  if (!isSelectableRecord(value)) {
    return null;
  }

  const description = typeof (value as { readonly nameShort?: unknown }).nameShort === "string"
    ? (value as { readonly nameShort?: string }).nameShort
    : undefined;

  return {
    value: value.id,
    label: value.name,
    description,
  };
}

/**
 * Build a selectable ship option from untrusted World API data.
 */
export function buildShipOption(value: unknown): SelectableOption | null {
  if (!isSelectableRecord(value)) {
    return null;
  }

  const description = typeof (value as { readonly className?: unknown }).className === "string"
    ? (value as { readonly className?: string }).className
    : undefined;

  return {
    value: value.id,
    label: value.name,
    description,
  };
}

/**
 * Load and cache selectable options from a World API collection response.
 */
export async function loadWorldApiOptions(
  url: string,
  mapOption: (value: unknown) => SelectableOption | null,
): Promise<readonly SelectableOption[]> {
  const cached = optionCache.get(url);
  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${String(response.status)}`);
  }

  const payload = (await response.json()) as WorldApiCollectionResponse<unknown>;
  const options = Array.isArray(payload.data)
    ? payload.data.reduce<SelectableOption[]>((result, value) => {
        const option = mapOption(value);
        if (option !== null) {
          result.push(option);
        }

        return result;
      }, [])
    : [];

  optionCache.set(url, options);
  return options;
}