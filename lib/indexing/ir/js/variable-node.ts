import { TypeReference } from "@lib/types/type-referance";
import type { AbstractNode } from "@ir/common/abstract-node";

type VariableDeclarationKind =
  | "const"
  | "let"
  | "var"
  | "using"
  | "await using";

interface VariableDeclaratorNode extends AbstractNode {
  nodeKind: "variableDeclarator";
  name: string;
  qualifiedName: string;
  startLine: number;
  endLine: number;
  type?: TypeReference;
  value?: string;
  isDestructured?: boolean;
  defaultValue?: string;
  initializerKind?: "expression" | "literal" | "require";
  requiredModule?: string;
}

interface VariableDeclarationNode extends AbstractNode {
  nodeKind: "variableDeclaration";
  declarationKind: VariableDeclarationKind;
  startLine: number;
  endLine: number;
  declarators: VariableDeclaratorNode[];
  sourceText: string;
}

export type {
  VariableDeclarationKind,
  VariableDeclarationNode,
  VariableDeclaratorNode,
};
