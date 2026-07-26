import TreeSitterParser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import type { FunctionNode } from "@ir/js_ts/function-node";
import type { ClassNode, ClassPropertyNode } from "@ir/js_ts/class-node";
import type { ParseContext } from "../parse-context";
import type { ParameterNode } from "@ir/js_ts/parameter-node";
import type { AbstractNode } from "@ir/common/abstract-node";
import type { FileNode } from "@ir/js_ts/file-node";
import type { ImportNode, ImportSpecifierNode } from "@ir/js_ts/import-node";
import type { ExportNode, ExportSpecifierNode } from "@ir/js_ts/export-node";
import {
  type VariableDeclarationKind,
  type VariableDeclarationNode,
  type VariableDeclaratorNode,
} from "@ir/js_ts/variable-node";
import type { RequireNode } from "@ir/js_ts/require-node";
import {
  mapStatementType,
  statementTypes,
  type StatementNode,
  type TreeSitterStatementType,
} from "../ir/js_ts/statement-node";
import type { UnknownNode } from "@ir/js_ts/unknown-node";

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
      filePath: this.parseContext.fileRelativePath,
      language: "javascript",
      nodeKind: "file",
      name: this.parseContext.fileName,
      lineCount: sourceCode.split("\n").length,
      sizeInBytes: Buffer.byteLength(sourceCode, "utf-8"),
      // contentHash: "", // You can compute a hash of the content if needed
      nodeId: uuidv4(), // Generate a unique ID for the file node
      startLine: 0,
      endLine: rootNode.endPosition.row,
    };

    this.irNodes.push(fileNode);
    await this.walkTree(rootNode, fileNode);
  }

  async walkTree(node: TreeSitterParser.SyntaxNode, parentNode: AbstractNode) {
    for (const child of node.children) {
      let nextParentNode = parentNode;
      if (child.type == "function_declaration") {
        const fnNode: FunctionNode = await this.parseFunction(
          child,
          parentNode,
        );
        this.irNodes.push(fnNode);
      } else if (child.type == "class_declaration") {
        const classNode: ClassNode = await this.parseClass(child, parentNode);
        this.irNodes.push(classNode);
      } else if (child.type == "import_statement") {
        const importNode = await this.parseImportStatement(child, parentNode);
        this.irNodes.push(importNode);
      } else if (child.type == "export_statement") {
        const exportNode = await this.parseExportStatement(child, parentNode);
        this.irNodes.push(exportNode);
      } else if (
        child.type == "lexical_declaration" ||
        child.type == "variable_declaration" ||
        child.type == "using_declaration"
      ) {
        const variableDeclarationNode = await this.parseVariableDeclaration(
          child,
          parentNode,
        );
        this.irNodes.push(variableDeclarationNode);
      } else if (
        statementTypes.includes(child.type as TreeSitterStatementType) &&
        child.type !== "import_statement" &&
        child.type !== "export_statement"
      ) {
        const stmtNode: StatementNode = await this.parseStatement(
          child,
          parentNode,
        );
        this.irNodes.push(stmtNode);
        nextParentNode = stmtNode;
      } else {
        const { v4: uuidv4 } = await import("uuid");
        // parse other stmt/expr/decl types beside defined on top
        const unknownNode: UnknownNode = {
          endLine: child.endPosition.row,
          filePath: this.parseContext.fileRelativePath,
          language: "javascript",
          nodeId: uuidv4(),
          treeSitterType: child.type,
          sourceText: child.text,
          nodeKind: "unknown",
          startLine: child.startPosition.row,
          parentNodeId: parentNode.nodeId,
          parentTreeSitterType: node.type,
        };
        // this.irNodes.push(unknownNode);
        // nextParentNode = unknownNode;
      }
      await this.walkTree(child, nextParentNode);
    }
  }

  async parseImportStatement(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<ImportNode> {
    const { v4: uuidv4 } = await import("uuid");
    const sourceNode = node.childForFieldName("source");
    const importClauseNode = node.children.find(
      (child) => child.type === "import_clause",
    );

    const specifiers: ImportSpecifierNode[] = [];
    let defaultImport: string | undefined;
    let namespaceImport: string | undefined;

    if (importClauseNode) {
      for (const child of importClauseNode.children) {
        if (child.type === "identifier") {
          defaultImport = child.text;
          continue;
        }

        if (child.type === "namespace_import") {
          const namespaceIdentifier = child.children.find(
            (grandChild) => grandChild.type === "identifier",
          );
          namespaceImport = namespaceIdentifier?.text;
          continue;
        }

        if (child.type === "named_imports") {
          for (const specifierNode of child.children) {
            if (specifierNode.type !== "import_specifier") {
              continue;
            }

            const importedNameNode = specifierNode.childForFieldName("name");
            const localNameNode = specifierNode.childForFieldName("alias");

            const importedName = importedNameNode?.text ?? specifierNode.text;
            const localName = localNameNode?.text ?? importedName;

            specifiers.push({
              nodeId: uuidv4(),
              filePath: this.parseContext.fileRelativePath,
              language: "javascript",
              nodeKind: "importSpecifier",
              parentNodeId: parentNode.nodeId,
              importedName,
              localName,
              startLine: specifierNode.startPosition.row,
              endLine: specifierNode.endPosition.row,
            });
          }
        }
      }
    }

    return {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "javascript",
      nodeKind: "import",
      parentNodeId: parentNode.nodeId,
      source: this.stripQuotes(sourceNode?.text) || "",
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      defaultImport,
      namespaceImport,
      specifiers,
      sourceText: node.text,
    };
  }

  async parseExportStatement(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<ExportNode> {
    const { v4: uuidv4 } = await import("uuid");
    const sourceNode = node.childForFieldName("source");
    const declarationNode = node.childForFieldName("declaration");
    const valueNode = node.childForFieldName("value");
    const exportClauseNode = node.children.find(
      (child) => child.type === "export_clause",
    );
    const namespaceExportNode = node.children.find(
      (child) => child.type === "namespace_export",
    );

    const specifiers: ExportSpecifierNode[] = [];
    if (exportClauseNode) {
      for (const child of exportClauseNode.children) {
        if (child.type !== "export_specifier") {
          continue;
        }

        const localNameNode = child.childForFieldName("name");
        const exportedNameNode = child.childForFieldName("alias");
        const localName = localNameNode?.text ?? child.text;
        const exportedName = exportedNameNode?.text ?? localName;

        specifiers.push({
          nodeId: uuidv4(),
          filePath: this.parseContext.fileRelativePath,
          language: "javascript",
          nodeKind: "exportSpecifier",
          parentNodeId: parentNode.nodeId,
          exportedName,
          localName,
          startLine: child.startPosition.row,
          endLine: child.endPosition.row,
        });
      }
    }

    let exportKind: ExportNode["exportKind"] = "named";
    if (namespaceExportNode) {
      exportKind = "namespace";
    } else if (declarationNode) {
      exportKind = "declaration";
    } else if (valueNode) {
      exportKind = "default";
    }

    return {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "javascript",
      nodeKind: "export",
      parentNodeId: parentNode.nodeId,
      exportKind,
      source: this.stripQuotes(sourceNode?.text),
      declarationText: declarationNode?.text ?? valueNode?.text,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      specifiers,
      sourceText: node.text,
    };
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

  async parseVariableDeclaration(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<VariableDeclarationNode> {
    if (
      node.type !== "lexical_declaration" &&
      node.type !== "variable_declaration" &&
      node.type !== "using_declaration"
    ) {
      throw new Error(
        `Expected a variable declaration node, but got ${node.type}`,
      );
    }

    const { v4: uuidv4 } = await import("uuid");
    const kindNode = node.childForFieldName("kind");
    const declarationKind = this.mapVariableDeclarationKind(
      node.type,
      kindNode?.text,
    );

    const variableDeclarationNode: VariableDeclarationNode = {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "javascript",
      nodeKind: "variableDeclaration",
      parentNodeId: parentNode.nodeId,
      declarationKind,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      declarators: [],
      sourceText: node.text,
    };

    for (const child of node.children) {
      if (child.type === "variable_declarator") {
        const parsedDeclarator = await this.parseVariableDeclarator(
          child,
          variableDeclarationNode,
        );
        variableDeclarationNode.declarators.push(parsedDeclarator.declarator);

        if (parsedDeclarator.requireNode) {
          this.irNodes.push(parsedDeclarator.requireNode);
        }
      }
    }

    return variableDeclarationNode;
  }

  async parseVariableDeclarator(
    node: TreeSitterParser.SyntaxNode,
    declarationNode: VariableDeclarationNode,
  ): Promise<{
    declarator: VariableDeclaratorNode;
    requireNode?: RequireNode;
  }> {
    const { v4: uuidv4 } = await import("uuid");
    const nameNode = node.childForFieldName("name");
    const valueNode = node.childForFieldName("value");
    const declaratorName = nameNode?.text ?? "unknown_variable";
    const requireCall = valueNode
      ? this.getRequireCallDetails(valueNode)
      : undefined;

    const declaratorNode: VariableDeclaratorNode = {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "javascript",
      nodeKind: "variableDeclarator",
      parentNodeId: declarationNode.nodeId,
      name: declaratorName,
      qualifiedName: declaratorName,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      type: "any",
      value: valueNode?.text,
      isDestructured:
        nameNode?.type === "array_pattern" ||
        nameNode?.type === "object_pattern",
      defaultValue:
        node.type === "variable_declarator" ? valueNode?.text : undefined,
      initializerKind: requireCall ? "require" : "expression",
      requiredModule: requireCall?.moduleName,
    };

    if (!requireCall) {
      return { declarator: declaratorNode };
    }

    return {
      declarator: declaratorNode,
      requireNode: {
        nodeId: uuidv4(),
        filePath: this.parseContext.fileRelativePath,
        language: "javascript",
        nodeKind: "require",
        parentNodeId: declaratorNode.nodeId,
        moduleName: requireCall.moduleName,
        assignedName: declaratorName,
        startLine: valueNode?.startPosition.row ?? node.startPosition.row,
        endLine: valueNode?.endPosition.row ?? node.endPosition.row,
        sourceText: valueNode?.text ?? node.text,
      },
    };
  }

  getRequireCallDetails(
    node?: TreeSitterParser.SyntaxNode,
  ): { moduleName: string } | undefined {
    if (!node || node.type !== "call_expression") {
      return undefined;
    }

    const functionNode = node.childForFieldName("function");
    if (!functionNode || functionNode.type !== "identifier") {
      return undefined;
    }

    if (functionNode.text !== "require") {
      return undefined;
    }

    const argumentsNode = node.childForFieldName("arguments");
    const moduleArgument = argumentsNode?.children.find(
      (child) => child.type === "string",
    );
    const moduleName = this.stripQuotes(moduleArgument?.text);

    if (!moduleName) {
      return undefined;
    }

    return { moduleName };
  }

  stripQuotes(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.replace(/^['"]|['"]$/g, "");
  }

  mapVariableDeclarationKind(
    nodeType: TreeSitterParser.SyntaxNode["type"],
    kindText?: string,
  ): VariableDeclarationKind {
    if (nodeType === "variable_declaration") {
      return "var";
    }

    if (nodeType === "using_declaration") {
      return kindText === "await using" ? "await using" : "using";
    }

    return kindText === "const" ? "const" : "let";
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
      nodeKind: "property",
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
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
          startLine: param.startPosition.row,
          endLine: param.endPosition.row,
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
            nodeKind: "parameter",
            startLine: param.startPosition.row,
            endLine: param.endPosition.row,
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
            nodeKind: "parameter",
            startLine: param.startPosition.row,
            endLine: param.endPosition.row,
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
          nodeKind: "parameter",
          startLine: param.startPosition.row,
          endLine: param.endPosition.row,
        });
      }
    }

    return parameters;
  }

  async parseStatement(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<StatementNode> {
    const { v4: uuidv4 } = await import("uuid");
    const statementNode: StatementNode = {
      nodeId: uuidv4(),
      language: "javascript",
      filePath: this.parseContext.fileRelativePath,
      parentNodeId: parentNode.nodeId,
      nodeKind: "statement",
      stmtType: mapStatementType(node.type as TreeSitterStatementType),
      text: node.text,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
    };

    return statementNode;
  }
}

export { Parser };
