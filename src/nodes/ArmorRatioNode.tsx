import type { NodeProps } from "@xyflow/react";
import { Hexagon } from "lucide-react";

import BaseNode from "./BaseNode";

function ArmorRatioNode(props: NodeProps) {
  return <BaseNode {...props} icon={Hexagon} />;
}

export default ArmorRatioNode;