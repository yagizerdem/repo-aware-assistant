import { TypeReference } from "../../../../types/type-referance";
import { SupportedLanguage } from "../../../../types/supported-language";
import { ParameterNode } from "./parameter-node";
import { LanguageSpecificFunctionData } from "../../common/language-specific-function-data";
import { AbstractNode } from "../../common/abstract-node";

interface FunctionNode extends AbstractNode {
  nodeKind: "function" | "method" | "constructor";

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
