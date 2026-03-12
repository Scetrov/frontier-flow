import type { NodeProps } from "@xyflow/react";
import { Shield } from "lucide-react";

import BaseNode from "./BaseNode";

function ShieldRatioNode(props: NodeProps) {
  return <BaseNode {...props} icon={Shield} />;
}

export default ShieldRatioNode;