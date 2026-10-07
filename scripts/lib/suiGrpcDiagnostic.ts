import { SuiGrpcClient } from "@mysten/sui/grpc";
import type { Signer } from "@mysten/sui/cryptography";
import type { Transaction } from "@mysten/sui/transactions";

type DiagnosticNetwork = "localnet" | "testnet" | "mainnet" | "devnet";

/** Maintained diagnostic access. There is no JSON-RPC fallback. */
export function createDiagnosticGrpcClient(url: string, network: DiagnosticNetwork = "localnet"): SuiGrpcClient {
  return new SuiGrpcClient({ baseUrl: url, network });
}

export async function executeDiagnosticTransaction(client: SuiGrpcClient, transaction: Transaction, signer: Signer) {
  const result = await client.signAndExecuteTransaction({
    transaction,
    signer,
    include: { effects: true, protoJson: true },
  });
  const executed = result.$kind === "Transaction" ? result.Transaction : result.FailedTransaction;
  const packageId = executed.effects?.changedObjects.find((object) => object.outputState === "PackageWrite" && object.idOperation === "Created")?.objectId;
  return {
    digest: executed.digest,
    packageId,
    success: executed.status.success === true,
  };
}

export async function simulateDiagnosticTransaction(client: SuiGrpcClient, transaction: Transaction, sender: string) {
  transaction.setSenderIfNotSet(sender);
  return client.simulateTransaction({
    transaction,
    checksEnabled: false,
    include: { commandResults: true, effects: true },
  });
}
