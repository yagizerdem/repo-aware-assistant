import { TypeReference } from "../../../../types/type-referance";
import { AbstractNode } from "../../common/abstract-node";
import { LanguageSpecificClassData } from "../../common/language-specific-class-data";
import { FunctionNode } from "./function-node";
import { ParameterNode } from "./parameter-node";

interface ClassPropertyNode extends AbstractNode {
  name: string;
  type?: TypeReference;
  modifiers: string[];
  optional?: boolean;
  readonly?: boolean;
  static?: boolean;
  defaultValue?: string;
}

interface ClassNode extends AbstractNode {
  name: string;
  qualifiedName: string;

  startLine: number;
  endLine: number;

  modifiers: string[];

  extends?: TypeReference[];
  implements?: TypeReference[];
  typeParameters?: string[];

  properties: ClassPropertyNode[];
  methods: FunctionNode[];
  constructors: FunctionNode[];

  parameters?: ParameterNode[];

  parentNodeId?: string;

  sourceText: string;

  languageSpecific?: LanguageSpecificClassData;
}

export type { ClassNode, ClassPropertyNode };
