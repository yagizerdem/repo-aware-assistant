import TreeSitterParser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import { FunctionNode } from "../ir/function-node";
import { ParseContext } from "../parse-context";

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
    }

    console.log(fnNode);
  }
}

export { Parser };
