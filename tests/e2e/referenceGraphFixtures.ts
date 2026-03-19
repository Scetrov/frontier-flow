import {
  compileableSmartTurretExtensions,
  type GraphFixture,
  type GraphFixtureEdge,
  type GraphFixtureNode,
  legacySmartTurretExtensionFixtures,
  seededSmartTurretExtensionFixtures,
} from "../../src/__fixtures__/graphs/smartTurretExtensionFixtures";

export type { GraphFixture, GraphFixtureEdge, GraphFixtureNode };

export interface ReferenceGraphFixture {
  readonly contractName: string;
  readonly expectedModuleName: string;
  readonly fixture: GraphFixture;
}

export interface LegacyReferenceGraphFixture {
  readonly id: string;
  readonly description: string;
  readonly expectedOutcome: "auto-migrate" | "remediate";
  readonly fixture: GraphFixture;
}

export interface SeededReferenceGraphFixture {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly fixture: GraphFixture;
}

export const referenceGraphFixtures: readonly ReferenceGraphFixture[] = compileableSmartTurretExtensions.map((entry) => ({
  contractName: entry.contractName,
  expectedModuleName: entry.expectedModuleName,
  fixture: entry.fixture,
}));

export const legacyReferenceGraphFixtures: readonly LegacyReferenceGraphFixture[] = legacySmartTurretExtensionFixtures;

export const seededReferenceGraphFixtures: readonly SeededReferenceGraphFixture[] = seededSmartTurretExtensionFixtures;