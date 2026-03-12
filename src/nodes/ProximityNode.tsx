import type { NodeProps } from "@xyflow/react";
import { Radar } from "lucide-react";

import BaseNode from "./BaseNode";

function ProximityNode(props: NodeProps) {
  return <BaseNode {...props} icon={Radar} />;
}

export default ProximityNode;