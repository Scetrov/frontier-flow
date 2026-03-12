import type { NodeProps } from "@xyflow/react";
import { List } from "lucide-react";

import BaseNode from "./BaseNode";

function ListOfTribeNode(props: NodeProps) {
  return <BaseNode {...props} icon={List} />;
}

export default ListOfTribeNode;