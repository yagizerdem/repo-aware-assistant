import type { AbstractNode } from "@ir/common/abstract-node";

interface ImportSpecifierNode extends AbstractNode {
  nodeKind: "importSpecifier";
  importedName: string;
  localName: string;
}

interface ImportNode extends AbstractNode {
  nodeKind: "import";
  source: string;
  startLine: number;
  endLine: number;
  defaultImport?: string;
  namespaceImport?: string;
  specifiers: ImportSpecifierNode[];
  sourceText: string;
}

export type { ImportNode, ImportSpecifierNode };
