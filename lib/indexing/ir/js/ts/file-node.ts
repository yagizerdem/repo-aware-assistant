import type { AbstractNode } from "../../common/abstract-node";

interface FileNode extends AbstractNode {
  name: string;
  sizeInBytes: number;
  lineCount: number;
  // contentHash: string;
}

export type { FileNode };
