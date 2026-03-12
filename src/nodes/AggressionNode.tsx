import type { NodeProps } from "@xyflow/react";
import { Swords } from "lucide-react";

import BaseNode from "./BaseNode";

function AggressionNode(props: NodeProps) {
  return <BaseNode {...props} icon={Swords} />;
}

export default AggressionNode;