import type { AbstractNode } from "@ir/common/abstract-node";

type StatementType =
  | "break"
  | "continue"
  | "debugger"
  | "declaration"
  | "do"
  | "empty"
  | "export"
  | "expression"
  | "forIn"
  | "for"
  | "if"
  | "import"
  | "labeled"
  | "return"
  | "block"
  | "switch"
  | "throw"
  | "try"
  | "while"
  | "with";

const statementTypeMap = {
  break_statement: "break",
  continue_statement: "continue",
  debugger_statement: "debugger",
  declaration: "declaration",
  do_statement: "do",
  empty_statement: "empty",
  export_statement: "export",
  expression_statement: "expression",
  for_in_statement: "forIn",
  for_statement: "for",
  if_statement: "if",
  import_statement: "import",
  labeled_statement: "labeled",
  return_statement: "return",
  statement_block: "block",
  switch_statement: "switch",
  throw_statement: "throw",
  try_statement: "try",
  while_statement: "while",
  with_statement: "with",
} as const satisfies Record<string, StatementType>;

type TreeSitterStatementType = keyof typeof statementTypeMap;

function mapStatementType(nodeType: TreeSitterStatementType): StatementType {
  return statementTypeMap[nodeType];
}

const statementTypes: TreeSitterStatementType[] = [
  "break_statement",
  "continue_statement",
  "debugger_statement",
  "declaration",
  "do_statement",
  "empty_statement",
  "export_statement",
  "expression_statement",
  "for_in_statement",
  "for_statement",
  "if_statement",
  "import_statement",
  "labeled_statement",
  "return_statement",
  "statement_block",
  "switch_statement",
  "throw_statement",
  "try_statement",
  "while_statement",
  "with_statement",
];

interface StatementNode extends AbstractNode {
  nodeKind: "statement";
  stmtType: StatementType;
  text: string;
}

export { statementTypes, mapStatementType };

export type { StatementNode, StatementType, TreeSitterStatementType };
