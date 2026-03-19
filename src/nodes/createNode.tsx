import type { NodeProps } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Ban,
  BotOff,
  BrickWall,
  Flame,
  Heart,
  Layers,
  Pencil,
  ListPlus,
  Radar,
  Scale,
  Shield,
  ShieldBan,
  Split,
  Swords,
  Tag,
  TrendingUp,
  UserRoundX,
  UserX,
  Users,
  Zap,
} from "lucide-react";

import BaseNode from "./BaseNode";

export const iconByNodeType: Readonly<Partial<Record<string, LucideIcon>>> = {
  aggression: Swords,
  proximity: Radar,
  getTribe: Users,
  listTribe: Users,
  listShip: Shield,
  listCharacter: Pencil,
  hpRatio: Heart,
  shieldRatio: Shield,
  armorRatio: BrickWall,
  getGroupId: Tag,
  getBehaviour: Activity,
  isAggressor: AlertTriangle,
  isInList: ListPlus,
  isInGroup: Layers,
  getPriorityWeight: Scale,
  behaviourBonus: TrendingUp,
  aggressorBonus: Zap,
  damageBonus: Flame,
  sizeTierBonus: Layers,
  excludeOwner: UserX,
  excludeSameTribe: UserRoundX,
  excludeStoppedAttack: Ban,
  excludeNpc: BotOff,
  isOwner: UserX,
  isSameTribe: UserRoundX,
  hasStoppedAttack: Ban,
  isNpc: BotOff,
  booleanNot: ShieldBan,
  booleanAnd: Split,
  booleanOr: Split,
  booleanXor: Split,
  addToQueue: ListPlus,
};

/**
 * Creates a React Flow node component that renders through the shared BaseNode chrome.
 */
export function createNodeComponent(icon?: LucideIcon) {
  function GeneratedNode(props: NodeProps) {
    return <BaseNode {...props} icon={icon} />;
  }

  return GeneratedNode;
}