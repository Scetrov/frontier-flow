import {
  compileableSmartTurretExtensions,
  type GraphFixture,
} from "../../__fixtures__/graphs/smartTurretExtensionFixtures";

export interface SupportedDagProfile {
  readonly id: string;
  readonly name: string;
  readonly supported: boolean;
  readonly requiredNodeTypes: readonly string[];
}

export interface ReferenceDagCase {
  readonly id: string;
  readonly name: string;
  readonly contractName: string;
  readonly expectedModuleName: string;
  readonly fixture: GraphFixture;
  readonly supported: boolean;
  readonly expectedBlockingDiagnostic?: string;
  readonly profile: SupportedDagProfile;
}

export const supportedReferenceDagCases: readonly ReferenceDagCase[] = compileableSmartTurretExtensions.map((extension) => ({
  id: extension.extensionId,
  name: extension.behaviorName,
  contractName: extension.contractName,
  expectedModuleName: extension.expectedModuleName,
  fixture: extension.fixture,
  supported: true,
  profile: {
    id: extension.extensionId,
    name: extension.behaviorName,
    supported: true,
    requiredNodeTypes: extension.requiredNodeTypes,
  },
}));

export const unsupportedReferenceDagCases: readonly ReferenceDagCase[] = [
  {
    id: "unsupported_missing_priority_input",
    name: "Missing Priority Input",
    contractName: "Unsupported Missing Priority",
    expectedModuleName: "unsupported_missing_priority",
    supported: false,
    expectedBlockingDiagnostic: "Required input 'priority in' is not connected.",
    profile: {
      id: "unsupported_missing_priority_input",
      name: "Missing Priority Input",
      supported: false,
      requiredNodeTypes: ["aggression", "addToQueue"],
    },
    fixture: {
      moduleName: "unsupported_missing_priority",
      nodes: [
        { id: "unsupported_aggression", type: "aggression", position: { x: 0, y: 100 } },
        { id: "unsupported_queue", type: "addToQueue", position: { x: 320, y: 120 } },
      ],
      edges: [
        {
          id: "unsupported_target_only",
          source: "unsupported_aggression",
          sourceHandle: "target",
          target: "unsupported_queue",
          targetHandle: "target",
        },
      ],
    },
  },
];

export const referenceDagSupportMatrix: readonly ReferenceDagCase[] = [
  ...supportedReferenceDagCases,
  ...unsupportedReferenceDagCases,
];