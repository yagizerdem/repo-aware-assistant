import type { AbstractNode } from "@ir/common/abstract-node";

interface InterfaceMemberNode extends AbstractNode {
  nodeKind: "interfaceMember";
  name: string;
  memberKind: "property" | "method" | "index" | "call" | "construct";
  typeText?: string;
  optional?: boolean;
}

interface InterfaceNode extends AbstractNode {
  nodeKind: "interface";
  name: string;
  qualifiedName: string;
  typeParameters?: string[];
  extendsTypes: string[];
  members: InterfaceMemberNode[];
  sourceText: string;
}

interface TypeAliasNode extends AbstractNode {
  nodeKind: "typeAlias";
  name: string;
  qualifiedName: string;
  typeParameters?: string[];
  value: string;
  sourceText: string;
}

interface EnumMemberNode extends AbstractNode {
  nodeKind: "enumMember";
  name: string;
  value?: string;
}

interface EnumNode extends AbstractNode {
  nodeKind: "enum";
  name: string;
  qualifiedName: string;
  isConst: boolean;
  members: EnumMemberNode[];
  sourceText: string;
}

export type {
  InterfaceMemberNode,
  InterfaceNode,
  TypeAliasNode,
  EnumMemberNode,
  EnumNode,
};
