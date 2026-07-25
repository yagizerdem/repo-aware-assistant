import { TypeReference } from "../../types/type-referance";
import { SupportedLanguage } from "../../types/supported-language";
import { ParameterNode } from "./parameter-node";
import { LanguageSpecificFunctionData } from "./language-specific-function-data";

interface FunctionNode {
  nodeId: string;
  repoId: string;

  kind: "function" | "method" | "constructor";

  name: string;
  qualifiedName: string;

  filePath: string;
  language: SupportedLanguage;

  startLine: number;
  endLine: number;

  parameters: ParameterNode[];

  sourceText: string;

  modifiers: string[];

  returnType?: TypeReference;

  parentNodeId?: string;

  languageSpecific?: LanguageSpecificFunctionData;
}

export type { FunctionNode };
