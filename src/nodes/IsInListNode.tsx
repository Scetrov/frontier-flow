import type { NodeProps } from "@xyflow/react";

import BaseNode from "./BaseNode";

function IsInListNode(props: NodeProps) {
  return <BaseNode {...props} shape="diamond" />;
}

export default IsInListNode;