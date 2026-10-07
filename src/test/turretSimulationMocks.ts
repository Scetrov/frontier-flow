import { bcs } from "@mysten/sui/bcs";
import { GrpcTypes } from "@mysten/sui/grpc";
import { toBase64 } from "@mysten/sui/utils";

/** Build a JSON response for preserved GraphQL and fetch-based test doubles. */
export function createJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

/** Actual protobuf/gRPC-web text response for the two-command turret simulation. */
export function createGrpcSimulationResponseBody(returnedBytes: readonly number[], error?: string): string {
  const wrappedBytes = bcs.vector(bcs.U8).serialize(Array.from(returnedBytes)).toBytes();
  const response = GrpcTypes.SimulateTransactionResponse.create({
    transaction: { effects: { status: { success: error === undefined, ...(error !== undefined ? { error: { description: error } } : {}) }, epoch: 1n } },
    commandOutputs: [{}, { returnValues: [{ value: { name: "vector<u8>", value: wrappedBytes } }] }],
  });
  const protobuf = GrpcTypes.SimulateTransactionResponse.toBinary(response);
  const trailers = new TextEncoder().encode("grpc-status: 0\r\n");
  const frames = new Uint8Array(10 + protobuf.length + trailers.length);
  const view = new DataView(frames.buffer);
  view.setUint32(1, protobuf.length);
  frames.set(protobuf, 5);
  const offset = 5 + protobuf.length;
  frames[offset] = 128;
  view.setUint32(offset + 1, trailers.length);
  frames.set(trailers, offset + 5);
  return toBase64(frames);
}

export function createGrpcSimulationResponse(returnedBytes: readonly number[], error?: string): Response {
  return new Response(createGrpcSimulationResponseBody(returnedBytes, error), {
    headers: { "content-type": "application/grpc-web-text" },
  });
}
