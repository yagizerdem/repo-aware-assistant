import TreeSitterParser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import { FunctionNode } from "../ir/js/ts/function-node";
import { ClassNode, ClassPropertyNode } from "../ir/js/ts/class-node";
import { ParseContext } from "../parse-context";
import { ParameterNode } from "../ir/js/ts/parameter-node";
import { AbstractNode } from "../ir/common/abstract-node";
import { FileNode } from "../ir/js/ts/file-node";

const treeSitterParser = new TreeSitterParser();
treeSitterParser.setLanguage(
  JavaScript as unknown as TreeSitterParser.Language,
);

class Parser {
  private parseContext: ParseContext;
  public irNodes: AbstractNode[] = [];

  public constructor(parseContext: ParseContext) {
    this.parseContext = parseContext;
    this.irNodes = [];
  }

  async parse() {
    const { v4: uuidv4 } = await import("uuid");
    const sourceCode = this.parseContext.fileContent;
    this.parseContext = this.parseContext;
    const tree = treeSitterParser.parse(sourceCode);
    const rootNode: TreeSitterParser.SyntaxNode = tree.rootNode;

    const fileNode: FileNode = {
      filePath: this.parseContext.fileAbsolutePath,
      language: "javascript",
      nodeKind: "file",
      name: this.parseContext.fileName,
      lineCount: sourceCode.split("\n").length,
      sizeInBytes: Buffer.byteLength(sourceCode, "utf-8"),
      // contentHash: "", // You can compute a hash of the content if needed
      nodeId: uuidv4(), // Generate a unique ID for the file node
      repoId: this.parseContext.repoId,
    };

    this.irNodes.push(fileNode);
    await this.walkTree(rootNode, fileNode);
  }

  async walkTree(node: TreeSitterParser.SyntaxNode, parentNode: AbstractNode) {
    for (const child of node.children) {
      if (child.type == "function_declaration") {
        const fnNode: FunctionNode = await this.parseFunction(
          child,
          parentNode,
        );
        this.irNodes.push(fnNode);
      }
      if (child.type == "class_declaration") {
        const classNode: ClassNode = await this.parseClass(child, parentNode);
        this.irNodes.push(classNode);
      }
      await this.walkTree(child, parentNode);
    }
  }

  async parseClass(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<ClassNode> {
    if (node.type !== "class_declaration") {
      throw new Error(
        `Expected a class_declaration node, but got ${node.type}`,
      );
    }

    const { v4: uuidv4 } = await import("uuid");
    const classNameNode = node.childForFieldName("name");
    const className = classNameNode?.text ?? "anonymous_class";

    const classNode: ClassNode = {
      nodeId: uuidv4(),
      nodeKind: "class",
      repoId: this.parseContext.repoId,
      filePath: this.parseContext.fileRelativePath,
      language: "javascript",
      parentNodeId: parentNode.nodeId,
      name: className,
      qualifiedName: className,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      modifiers: [],
      properties: [],
      methods: [],
      constructors: [],
      sourceText: node.text,
    };

    const heritageNode = node.childForFieldName("heritage");
    if (heritageNode && heritageNode.text.startsWith("extends ")) {
      classNode.extends = ["class"];
    }

    const classBodyNode = node.childForFieldName("body");
    if (!classBodyNode) {
      return classNode;
    }

    for (const member of classBodyNode.children) {
      if (member.type === "method_definition") {
        const methodNode = await this.parseMethodDefinition(member, classNode);

        if (methodNode.nodeKind === "constructor") {
          classNode.constructors.push(methodNode);
        } else {
          classNode.methods.push(methodNode);
        }
      }

      if (
        member.type === "field_definition" ||
        member.type === "public_field_definition"
      ) {
        classNode.properties.push(await this.parseClassProperty(member));
      }
    }

    return classNode;
  }

  async parseFunction(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<FunctionNode> {
    if (node.type !== "function_declaration") {
      throw new Error(
        `Expected a function_declaration node, but got ${node.type}`,
      );
    }

    const { v4: uuidv4 } = await import("uuid");
    const fnNode: Partial<FunctionNode> = {
      nodeId: uuidv4(),
      repoId: this.parseContext?.repoId,
      parentNodeId: parentNode.nodeId,
      endLine: node.endPosition.row,
      startLine: node.startPosition.row,
      filePath: this.parseContext.fileRelativePath,
      returnType: "any", // JavaScript functions can return any type, so we can set this to "any" for now.
      modifiers: [], // JavaScript doesn't have explicit modifiers like public/private, so we can leave this empty for now.
      nodeKind: "function",
      language: "javascript",
      sourceText: node.text,
      parameters: [],
    };

    for (const child of node.children) {
      if (child.type == "identifier") {
        fnNode.name = child.text;
        fnNode.qualifiedName = child.text;
      }
      if (child.type == "formal_parameters") {
        fnNode.parameters = await this.extractParameters(child);
      }
    }

    return fnNode as FunctionNode;
  }

  async parseMethodDefinition(
    node: TreeSitterParser.SyntaxNode,
    classNode: ClassNode,
  ): Promise<FunctionNode> {
    const { v4: uuidv4 } = await import("uuid");

    const methodNameNode = node.childForFieldName("name");
    const methodName = methodNameNode?.text ?? "anonymous_method";
    const parametersNode = node.childForFieldName("parameters");
    const isConstructor = methodName === "constructor";

    return {
      nodeId: uuidv4(),
      repoId: this.parseContext.repoId,
      filePath: this.parseContext.fileRelativePath,
      language: "javascript",
      parentNodeId: classNode.nodeId,
      nodeKind: isConstructor ? "constructor" : "method",
      name: methodName,
      qualifiedName: `${classNode.qualifiedName}.${methodName}`,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      sourceText: node.text,
      modifiers: node.text.startsWith("static ") ? ["static"] : [],
      returnType: "any",
      parameters: parametersNode
        ? await this.extractParameters(parametersNode)
        : [],
    };
  }

  async parseClassProperty(
    node: TreeSitterParser.SyntaxNode,
  ): Promise<ClassPropertyNode> {
    const { v4: uuidv4 } = await import("uuid");
    const nameNode = node.childForFieldName("name");
    const valueNode = node.childForFieldName("value");

    const propertyName = nameNode?.text ?? "unknown_property";
    const modifiers: string[] = [];

    if (node.text.startsWith("static ")) {
      modifiers.push("static");
    }

    return {
      name: propertyName,
      type: "any",
      modifiers,
      static: modifiers.includes("static"),
      defaultValue: valueNode?.text,
      filePath: this.parseContext.fileRelativePath,
      language: "javascript",
      nodeId: uuidv4(),
      repoId: this.parseContext.repoId,
      nodeKind: "property",
    };
  }

  async extractParameters(
    node: TreeSitterParser.SyntaxNode,
  ): Promise<ParameterNode[]> {
    const parameters: ParameterNode[] = [];
    const { v4: uuidv4 } = await import("uuid");

    for (const param of node.children) {
      if (param.type == "identifier") {
        parameters.push({
          name: param.text,
          type: "any",
          filePath: this.parseContext.fileRelativePath,
          language: "javascript",
          nodeKind: "parameter",
          nodeId: uuidv4(),
          repoId: this.parseContext.repoId,
        });
        continue;
      }

      if (param.type == "assignment_pattern") {
        const identifierNode = param.childForFieldName("left");
        const defaultValueNode = param.childForFieldName("right");

        if (identifierNode) {
          parameters.push({
            name: identifierNode.text,
            type: "any",
            defaultValue: defaultValueNode?.text,
            filePath: this.parseContext.fileRelativePath,
            language: "javascript",
            nodeId: uuidv4(),
            repoId: this.parseContext.repoId,
            nodeKind: "parameter",
          });
        }
        continue;
      }

      if (param.type == "rest_pattern") {
        const identifierNode = param.childForFieldName("argument");

        if (identifierNode) {
          parameters.push({
            name: identifierNode.text,
            type: "any",
            variadic: true,
            filePath: this.parseContext.fileRelativePath,
            language: "javascript",
            nodeId: uuidv4(),
            repoId: this.parseContext.repoId,
            nodeKind: "parameter",
          });
        }
        continue;
      }

      if (param.type !== "," && param.type !== "(" && param.type !== ")") {
        parameters.push({
          name: param.text,
          type: "any",
          filePath: this.parseContext.fileRelativePath,
          language: "javascript",
          nodeId: uuidv4(),
          repoId: this.parseContext.repoId,
          nodeKind: "parameter",
        });
      }
    }

    return parameters;
  }
}

export { Parser };
