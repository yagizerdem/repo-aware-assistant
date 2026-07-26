import type { AbstractNode } from "@ir/common/abstract-node";

type ExportKind = "named" | "namespace" | "declaration" | "default";

interface ExportSpecifierNode extends AbstractNode {
  nodeKind: "exportSpecifier";
  exportedName: string;
  localName: string;
}

interface ExportNode extends AbstractNode {
  nodeKind: "export";
  exportKind: ExportKind;
  startLine: number;
  endLine: number;
  source?: string;
  declarationText?: string;
  specifiers: ExportSpecifierNode[];
  sourceText: string;
}

export type { ExportKind, ExportNode, ExportSpecifierNode };
