import type { NodeTypes } from "@xyflow/react";

import AggressionNode from "./AggressionNode";
import ArmorRatioNode from "./ArmorRatioNode";
import AddToQueueNode from "./AddToQueueNode";
import GetTribeNode from "./GetTribeNode";
import HpRatioNode from "./HpRatioNode";
import IsInListNode from "./IsInListNode";
import ListOfTribeNode from "./ListOfTribeNode";
import ProximityNode from "./ProximityNode";
import ShieldRatioNode from "./ShieldRatioNode";

/**
 * Stable ReactFlow node registry for the verified node set.
 */
export const flowNodeTypes: NodeTypes = {
  aggression: AggressionNode,
  proximity: ProximityNode,
  getTribe: GetTribeNode,
  listOfTribe: ListOfTribeNode,
  isInList: IsInListNode,
  addToQueue: AddToQueueNode,
  hpRatio: HpRatioNode,
  shieldRatio: ShieldRatioNode,
  armorRatio: ArmorRatioNode,
};