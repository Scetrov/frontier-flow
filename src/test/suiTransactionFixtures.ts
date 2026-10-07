import { normalizeSuiAddress } from "@mysten/sui/utils";

export const TEST_TRANSACTION_DIGEST = "11111111111111111111111111111111";
export const TEST_PUBLISHED_PACKAGE = normalizeSuiAddress("0xabc123");

export function createPublicationResult(digest = TEST_TRANSACTION_DIGEST, packageId = TEST_PUBLISHED_PACKAGE) {
  return {
    $kind: "Transaction",
    Transaction: { digest, status: { success: true }, effects: {
      changedObjects: [{ objectId: normalizeSuiAddress(packageId), outputState: "PackageWrite", idOperation: "Created" }],
    } },
    protoJson: { digest, effects: { status: { success: true } } },
  };
}

export function createTurretAuthDatatype(packageId = TEST_PUBLISHED_PACKAGE, moduleName = "starter_contract") {
  return { datatype: { definingId: normalizeSuiAddress(packageId), typeName: `${normalizeSuiAddress(packageId)}::${moduleName}::TurretAuth`, name: "TurretAuth", module: moduleName } };
}
