import { bcs } from "@mysten/sui/bcs";

const MOCK_ADDRESS = "0x1111111111111111111111111111111111111111111111111111111111111111";
const MOCK_DIGEST = "11111111111111111111111111111111";

/**
 * Build a JSON response suitable for GraphQL and fetch-based test doubles.
 */
export function createJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

/**
 * Build a dev-inspect success payload with a single `vector<u8>` return value.
 */
export function createDevInspectSuccessResponse(returnedBytes: readonly number[]) {
  const wrappedReturnedBytes = Array.from(bcs.vector(bcs.U8).serialize(Array.from(returnedBytes)).toBytes());
  const returnValues: [number[], string][] = [[wrappedReturnedBytes, "vector<u8>"]];

  return {
    effects: {
      executedEpoch: "1",
      gasObject: {
        owner: { AddressOwner: MOCK_ADDRESS },
        reference: {
          digest: MOCK_DIGEST,
          objectId: MOCK_ADDRESS,
          version: "1",
        },
      },
      gasUsed: {
        computationCost: "0",
        nonRefundableStorageFee: "0",
        storageCost: "0",
        storageRebate: "0",
      },
      messageVersion: "v1" as const,
      status: { status: "success" as const },
      transactionDigest: MOCK_DIGEST,
    },
    error: null,
    events: [],
    results: [{
      returnValues,
    }],
  };
}

/**
 * Build a dev-inspect failure payload for execution-path tests.
 */
export function createDevInspectErrorResponse(message: string) {
  return {
    effects: {
      executedEpoch: "1",
      gasObject: {
        owner: { AddressOwner: MOCK_ADDRESS },
        reference: {
          digest: MOCK_DIGEST,
          objectId: MOCK_ADDRESS,
          version: "1",
        },
      },
      gasUsed: {
        computationCost: "0",
        nonRefundableStorageFee: "0",
        storageCost: "0",
        storageRebate: "0",
      },
      messageVersion: "v1" as const,
      status: { status: "failure" as const, error: message },
      transactionDigest: MOCK_DIGEST,
    },
    error: message,
    events: [],
    results: [],
  };
}