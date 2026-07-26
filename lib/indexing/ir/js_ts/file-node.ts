import type { AbstractNode } from "@ir/common/abstract-node";

interface FileNode extends AbstractNode {
  name: string;
  sizeInBytes: number;
  lineCount: number;
  // contentHash: string;
}

export type { FileNode };
