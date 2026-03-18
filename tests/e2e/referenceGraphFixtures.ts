import {
  compileableSmartTurretExtensions,
  type GraphFixture,
  type GraphFixtureEdge,
  type GraphFixtureNode,
} from "../../src/__fixtures__/graphs/smartTurretExtensionFixtures";

export type { GraphFixture, GraphFixtureEdge, GraphFixtureNode };

export interface ReferenceGraphFixture {
  readonly contractName: string;
  readonly expectedModuleName: string;
  readonly fixture: GraphFixture;
}

export const referenceGraphFixtures: readonly ReferenceGraphFixture[] = compileableSmartTurretExtensions.map((entry) => ({
  contractName: entry.contractName,
  expectedModuleName: entry.expectedModuleName,
  fixture: entry.fixture,
}));