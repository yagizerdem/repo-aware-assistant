import { SupportedLanguage } from "../../../types/supported-language";

interface AbstractNode {
  nodeId: string;
  repoId: string;
  filePath: string;
  language: SupportedLanguage;
  nodeKind: string;
}

export type { AbstractNode };
