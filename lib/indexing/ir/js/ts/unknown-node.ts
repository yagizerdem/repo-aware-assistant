import type { AbstractNode } from "../../common/abstract-node";

interface UnknownNode extends AbstractNode {
  nodeKind: "unknown";

  treeSitterType: string;
  sourceText: string;

  parentTreeSitterType?: string;
}

export type { UnknownNode };
