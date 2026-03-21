import type { PackageReferenceBundle } from "../compiler/types";

const RESOURCE_SOURCE = "https://docs.evefrontier.com/tools/resources";
const LAST_VERIFIED_ON = "2026-03-21";

/**
 * Maintained Stillness and Utopia package references used for deployment validation.
 */
export const PACKAGE_REFERENCE_BUNDLES: readonly PackageReferenceBundle[] = [
  {
    targetId: "testnet:stillness",
    environmentLabel: "Stillness",
    worldPackageId: "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c",
    objectRegistryId: "0x454a9aa3d37e1d08d3c9181239c1b683781e4087fbbbd48c935d54b6736fd05c",
    serverAddressRegistryId: "0xeb97b81668699672b1147c28dacb3d595534c48f4e177d3d80337dbde464f05f",
    source: RESOURCE_SOURCE,
    lastVerifiedOn: LAST_VERIFIED_ON,
  },
  {
    targetId: "testnet:utopia",
    environmentLabel: "Utopia",
    worldPackageId: "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75",
    objectRegistryId: "0xc2b969a72046c47e24991d69472afb2216af9e91caf802684514f39706d7dc57",
    serverAddressRegistryId: "0x9a9f2f7d1b8cf100feb532223aa6c38451edb05406323af5054f9d974555708b",
    source: RESOURCE_SOURCE,
    lastVerifiedOn: LAST_VERIFIED_ON,
  },
];

/**
 * Resolve the published package reference bundle for a non-local deployment target.
 */
export function getPackageReferenceBundle(targetId: PackageReferenceBundle["targetId"]): PackageReferenceBundle {
  const bundle = PACKAGE_REFERENCE_BUNDLES.find((candidate) => candidate.targetId === targetId);

  if (bundle === undefined) {
    throw new Error(`Missing package reference bundle for ${targetId}`);
  }

  return bundle;
}