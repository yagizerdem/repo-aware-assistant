import { SupportedLanguage } from "../../types/supported-language";

interface FileNode {
  nodeId: string;
  repoId: string;

  name: string;
  filePath: string;
  language: SupportedLanguage;

  sizeInBytes: number;
  lineCount: number;
  contentHash: string;
}

export type { FileNode };
