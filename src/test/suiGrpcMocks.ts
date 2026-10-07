import { GrpcTypes } from "@mysten/sui/grpc";
import { toBase64 } from "@mysten/sui/utils";

export function grpcResponseBody(protobuf: Uint8Array): string {
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

export function grpcResponse(protobuf: Uint8Array): Response {
  return new Response(grpcResponseBody(protobuf), { headers: { "content-type": "application/grpc-web-text" } });
}

export function emptyOwnedObjectsResponseBody(): string {
  return grpcResponseBody(GrpcTypes.ListOwnedObjectsResponse.toBinary(GrpcTypes.ListOwnedObjectsResponse.create({ objects: [] })));
}

export function packageObjectResponseBody(objectId: string): string {
  return grpcResponseBody(GrpcTypes.BatchGetObjectsResponse.toBinary(GrpcTypes.BatchGetObjectsResponse.create({
    objects: [{ result: { oneofKind: "object", object: {
      objectId, objectType: "package", version: 1n, digest: "11111111111111111111111111111111",
      owner: { kind: GrpcTypes.Owner_OwnerKind.IMMUTABLE },
    } } }],
  })));
}
