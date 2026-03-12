import type { NodeProps } from "@xyflow/react";
import { ArrowRight } from "lucide-react";

import BaseNode from "./BaseNode";

function AddToQueueNode(props: NodeProps) {
  return <BaseNode {...props} icon={ArrowRight} />;
}

export default AddToQueueNode;