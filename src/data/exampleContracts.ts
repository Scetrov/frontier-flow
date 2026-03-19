import { seededSmartTurretExtensionFixtures } from "../__fixtures__/graphs/smartTurretExtensionFixtures";
import { createNamedFlowContract, type NamedFlowContract } from "../utils/contractStorage";

import { createFlowFromGraphFixture } from "./kitchenSinkFlow";

/**
 * Curated seeded example contracts shown in the Load panel on a clean workspace.
 */
export const seededExampleContracts: readonly NamedFlowContract[] = seededSmartTurretExtensionFixtures.flatMap((fixture) => {
  try {
    const flow = createFlowFromGraphFixture(fixture.fixture);

    return [
      createNamedFlowContract(fixture.name, flow.nodes, flow.edges, {
        id: `seed:${fixture.id}`,
        description: fixture.description,
        updatedAt: new Date(0).toISOString(),
        isSeeded: true,
      }),
    ];
  } catch {
    return [];
  }
});