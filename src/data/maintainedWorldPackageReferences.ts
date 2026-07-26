export type MaintainedRemoteTargetId = "testnet:stillness" | "testnet:utopia";

export interface MaintainedWorldPackageReference {
  readonly targetId: MaintainedRemoteTargetId;
  readonly environmentLabel: string;
  readonly worldPackageId: string;
  readonly originalWorldPackageId: string;
  readonly objectRegistryId: string;
  readonly serverAddressRegistryId: string;
  readonly sourceVersionTag: string;
  readonly toolchainVersion: string;
  readonly publicationTransaction: string;
  readonly source: string;
  readonly lastVerifiedOn: string;
}

export const RESOURCE_SOURCE = "https://docs.evefrontier.com/tools/resources";
export const LAST_VERIFIED_ON = "2026-07-26";

/**
 * Authoritative checked-in remote bundles. Keep every field in each entry
 * synchronized as one reviewed, lineage-bound deployment reference.
 */
export const MAINTAINED_WORLD_PACKAGE_REFERENCES: readonly MaintainedWorldPackageReference[] = [
  {
    targetId: "testnet:stillness",
    environmentLabel: "Stillness",
    worldPackageId: "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
    originalWorldPackageId: "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
    objectRegistryId: "0xf6aed9361acc0d7021672b653ebe9dae45d88e11fecef01cc5434c8f60ae764f",
    serverAddressRegistryId: "0xdb5f40fd5659e4f21d6b07ed3cedcd532a21a6054815a7b3fe3817631ed6dbd2",
    sourceVersionTag: "v0.0.24",
    toolchainVersion: "1.74.0",
    publicationTransaction: "5rnk369zjxUZdo9Tovv8moGymDGAUnRUhhUutFH119nv",
    source: RESOURCE_SOURCE,
    lastVerifiedOn: LAST_VERIFIED_ON,
  },
  {
    targetId: "testnet:utopia",
    environmentLabel: "Utopia",
    worldPackageId: "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1",
    originalWorldPackageId: "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75",
    objectRegistryId: "0xc2b969a72046c47e24991d69472afb2216af9e91caf802684514f39706d7dc57",
    serverAddressRegistryId: "0x9a9f2f7d1b8cf100feb532223aa6c38451edb05406323af5054f9d974555708b",
    sourceVersionTag: "v0.0.21",
    toolchainVersion: "1.68.0",
    publicationTransaction: "AzBhmMFd9UTbr4m4hnSjSbBLkmVW3VESUDG15DGnCT8",
    source: RESOURCE_SOURCE,
    lastVerifiedOn: LAST_VERIFIED_ON,
  },
];

export const MAINTAINED_REMOTE_TARGET_IDS: readonly MaintainedRemoteTargetId[] = MAINTAINED_WORLD_PACKAGE_REFERENCES.map(
  ({ targetId }) => targetId,
);
