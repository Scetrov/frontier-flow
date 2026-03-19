import type { NodeProps } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Ban,
  BookOpen,
  BotOff,
  BrickWall,
  Clock3,
  Flame,
  Hash,
  Heart,
  Layers,
  ListChecks,
  ListPlus,
  Package,
  Radar,
  Repeat,
  Scale,
  Search,
  Settings,
  Shield,
  ShieldBan,
  Split,
  Skull,
  Swords,
  Tag,
  TrendingUp,
  UserRoundX,
  UserX,
  User,
  Users,
  Zap,
} from "lucide-react";

import BaseNode from "./BaseNode";

export const iconByNodeType: Readonly<Partial<Record<string, LucideIcon>>> = {
  aggression: Swords,
  proximity: Radar,
  getTribe: Users,
  hpRatio: Heart,
  shieldRatio: Shield,
  armorRatio: BrickWall,
  getGroupId: Tag,
  getBehaviour: Activity,
  isAggressor: AlertTriangle,
  getPriorityWeight: Scale,
  behaviourBonus: TrendingUp,
  aggressorBonus: Zap,
  damageBonus: Flame,
  sizeTierBonus: Layers,
  groupBonusLookup: Search,
  threatBonus: Skull,
  historyPenalty: Clock3,
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
  isInList: ListChecks,
  countAggressors: Hash,
  groupBonusConfig: Settings,
  roundRobinConfig: Repeat,
  threatLedgerConfig: BookOpen,
  typeBlocklistConfig: ShieldBan,
  getTribeListFromConfig: Users,
  getItemListFromConfig: Package,
  getCharacterListFromConfig: User,
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