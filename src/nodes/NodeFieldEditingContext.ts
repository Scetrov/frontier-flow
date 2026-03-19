import { createContext } from "react";

import type { NodeFieldMap } from "../types/nodes";

export type NodeFieldChangeHandler = (nodeId: string, fields: NodeFieldMap) => void;

export const NodeFieldEditingContext = createContext<NodeFieldChangeHandler | null>(null);