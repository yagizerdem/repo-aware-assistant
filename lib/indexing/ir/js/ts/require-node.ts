import type { AbstractNode } from "../../common/abstract-node";

interface RequireNode extends AbstractNode {
  nodeKind: "require";
  moduleName: string;
  assignedName?: string;
  startLine: number;
  endLine: number;
  sourceText: string;
}

export type { RequireNode };
