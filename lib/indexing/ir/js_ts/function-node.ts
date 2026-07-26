import { TypeReference } from "@lib/types/type-referance";
import { SupportedLanguage } from "@lib/types/supported-language";
import { ParameterNode } from "./parameter-node";
import { LanguageSpecificFunctionData } from "@ir/common/language-specific-function-data";
import { AbstractNode } from "@ir/common/abstract-node";

interface FunctionNode extends AbstractNode {
  nodeKind: "function" | "method" | "constructor";

  name: string;
  qualifiedName: string;

  filePath: string;
  language: SupportedLanguage;

  parameters: ParameterNode[];

  sourceText: string;

  modifiers: string[];

  returnType?: TypeReference;

  languageSpecific?: LanguageSpecificFunctionData;
}

export type { FunctionNode };
