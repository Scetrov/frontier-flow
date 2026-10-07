export function createSuiGrpcBalanceResponseBody(): string;

export function startSuiGrpcResponder(options: {
  origin: string;
  mode?: "success" | "unavailable" | "rejected-preflight";
  port?: number;
  tls?: { cert: Buffer | string; key: Buffer | string } | null;
}): Promise<{
  baseUrl: string;
  requests: { method: string | undefined; path: string | undefined; origin: string | undefined; jsonRpc: boolean }[];
  close: () => Promise<void>;
}>;
