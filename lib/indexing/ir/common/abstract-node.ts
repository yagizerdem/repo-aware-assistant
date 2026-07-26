import { SupportedLanguage } from "../../../types/supported-language";

interface AbstractNode {
  nodeId: string;
  filePath: string;
  language: SupportedLanguage;
  nodeKind: string;
  startLine: number;
  endLine: number;
  parentNodeId?: string;
}

export type { AbstractNode };
