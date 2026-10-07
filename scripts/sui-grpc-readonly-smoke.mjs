// Opt-in read-only gRPC smoke. Never signs or submits.
// FRONTIER_SUI_GRPC_SMOKE=1 node scripts/sui-grpc-readonly-smoke.mjs
const enabled = process.env.FRONTIER_SUI_GRPC_SMOKE === "1";
if (!enabled) {
  console.error("unsuccessful: opt-in read-only gRPC smoke was not enabled");
  process.exitCode = 2;
} else {
  const endpoint = process.env.FRONTIER_SUI_GRPC_URL ?? "https://fullnode.testnet.sui.io:443";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${endpoint}/sui.rpc.v2.StateService/GetBalance`, {
      method: "POST",
      headers: { "content-type": "application/grpc-web+proto" },
      body: new Uint8Array(),
      signal: controller.signal,
    });
    console.log(`smoke status ${response.status} from ${endpoint}`);
    if (!response.ok) {
      console.error("unsuccessful: required gRPC read did not complete; fixture results were not substituted");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`unsuccessful: ${error instanceof Error ? error.message : "smoke failed"}`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
  }
}
