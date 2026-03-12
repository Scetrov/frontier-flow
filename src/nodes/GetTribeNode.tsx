import type { NodeProps } from "@xyflow/react";
import { Users } from "lucide-react";

import BaseNode from "./BaseNode";

function GetTribeNode(props: NodeProps) {
  return <BaseNode {...props} icon={Users} />;
}

export default GetTribeNode;