import TreeSitterParser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import { FunctionNode } from "../ir/function-node";
import { ParseContext } from "../parse-context";
import { ParameterNode } from "../ir/parameter-node";

const treeSitterParser = new TreeSitterParser();
treeSitterParser.setLanguage(
  JavaScript as unknown as TreeSitterParser.Language,
);

class Parser {
  private parseContext!: ParseContext;

  async parse(sourceCode: string, parseContext: ParseContext) {
    this.parseContext = parseContext;
    const tree = treeSitterParser.parse(sourceCode);

    const rootNode: TreeSitterParser.SyntaxNode = tree.rootNode;

    await this.walkTree(rootNode);
  }

  async walkTree(node: TreeSitterParser.SyntaxNode) {
    for (const child of node.children) {
      if (child.type == "function_declaration") {
        await this.parseFunction(child);
      }
      await this.walkTree(child);
    }
  }

  async parseFunction(node: TreeSitterParser.SyntaxNode) {
    if (node.type !== "function_declaration") {
      throw new Error(
        `Expected a function_declaration node, but got ${node.type}`,
      );
    }

    const { v4: uuidv4 } = await import("uuid");
    const fnNode: FunctionNode = {
      nodeId: uuidv4(),
      repoId: this.parseContext?.repoId,
      endLine: node.endPosition.row,
      startLine: node.startPosition.row,
      filePath: this.parseContext.filePath,
      language: "javascript",
      sourceText: node.text,
    } as FunctionNode;

    for (const child of node.children) {
      if (child.type == "identifier") {
        fnNode.name = child.text;
        fnNode.qualifiedName = child.text;
      }
      if (child.type == "formal_parameters") {
        const parameters: ParameterNode[] = [];
        for (const param of child.children) {
          if (param.type == "identifier") {
            parameters.push({
              name: param.text,
              type: "any",
            });
          } else if (param.type == "assignment_pattern") {
            const identifierNode = param.childForFieldName("left");
            const defaultValueNode = param.childForFieldName("right");

            if (identifierNode && defaultValueNode) {
              parameters.push({
                name: identifierNode.text,
                type: "any",
                defaultValue: defaultValueNode.text,
              });
            }
          } else if (param.type == "rest_pattern") {
            const identifierNode = param.childForFieldName("identifier");
            if (identifierNode) {
              parameters.push({
                name: identifierNode.text,
                type: "any",
                variadic: true,
              });
            }
          } else {
            parameters.push({
              name: param.text,
              type: "any",
            });
          }

          fnNode.parameters = parameters;
        }
      }
    }
  }
}

export { Parser };
