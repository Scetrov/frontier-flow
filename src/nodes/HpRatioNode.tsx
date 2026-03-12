import type { NodeProps } from "@xyflow/react";
import { Heart } from "lucide-react";

import BaseNode from "./BaseNode";

function HpRatioNode(props: NodeProps) {
  return <BaseNode {...props} icon={Heart} />;
}

export default HpRatioNode;