import TreeSitterParser from "tree-sitter";
import TypeScriptPackage from "tree-sitter-typescript";
import type { FunctionNode } from "@lib/indexing/ir/js/function-node";
import type {
  ClassNode,
  ClassPropertyNode,
} from "@lib/indexing/ir/js/class-node";
import type { ParseContext } from "../parse-context";
import type { ParameterNode } from "@lib/indexing/ir/js/parameter-node";
import type { AbstractNode } from "@ir/common/abstract-node";
import type { FileNode } from "@lib/indexing/ir/js/file-node";
import type {
  ImportNode,
  ImportSpecifierNode,
} from "@lib/indexing/ir/js/import-node";
import type {
  ExportNode,
  ExportSpecifierNode,
} from "@lib/indexing/ir/js/export-node";
import {
  type VariableDeclarationKind,
  type VariableDeclarationNode,
  type VariableDeclaratorNode,
} from "@lib/indexing/ir/js/variable-node";
import type { RequireNode } from "@lib/indexing/ir/js/require-node";
import {
  mapStatementType,
  statementTypes,
  type StatementNode,
  type TreeSitterStatementType,
} from "../ir/js/statement-node";
import type { UnknownNode } from "@lib/indexing/ir/js/unknown-node";
import type {
  EnumMemberNode,
  EnumNode,
  InterfaceMemberNode,
  InterfaceNode,
  TypeAliasNode,
} from "@lib/indexing/ir/ts/type-declaration-node";

const treeSitterParser = new TreeSitterParser();
const tsLanguage = (
  TypeScriptPackage as unknown as { typescript: TreeSitterParser.Language }
).typescript;
treeSitterParser.setLanguage(tsLanguage);

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
    const tree = treeSitterParser.parse(sourceCode);
    const rootNode: TreeSitterParser.SyntaxNode = tree.rootNode;

    const fileNode: FileNode = {
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      nodeKind: "file",
      name: this.parseContext.fileName,
      lineCount: sourceCode.split("\n").length,
      sizeInBytes: Buffer.byteLength(sourceCode, "utf-8"),
      nodeId: uuidv4(),
      startLine: 0,
      endLine: rootNode.endPosition.row,
      startIndex: 0,
      endIndex: rootNode.endIndex,
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
        nextParentNode = fnNode;
      } else if (
        child.type == "class_declaration" ||
        child.type == "abstract_class_declaration" ||
        child.type == "class"
      ) {
        const classNode: ClassNode = await this.parseClass(child, parentNode);
        this.irNodes.push(classNode);
        // parseClass already traverses method/property bodies with correct parents.
        continue;
      } else if (child.type == "interface_declaration") {
        const interfaceNode = await this.parseInterface(child, parentNode);
        this.irNodes.push(interfaceNode);
      } else if (child.type == "type_alias_declaration") {
        const typeAliasNode = await this.parseTypeAlias(child, parentNode);
        this.irNodes.push(typeAliasNode);
      } else if (child.type == "enum_declaration") {
        const enumNode = await this.parseEnum(child, parentNode);
        this.irNodes.push(enumNode);
      } else if (child.type == "import_statement") {
        const importNode = await this.parseImportStatement(child, parentNode);
        this.irNodes.push(importNode);
      } else if (child.type == "export_statement") {
        const exportNode = await this.parseExportStatement(child, parentNode);
        this.irNodes.push(exportNode);
      } else if (
        child.type == "lexical_declaration" ||
        child.type == "variable_declaration"
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
        const unknownNode: UnknownNode = {
          endLine: child.endPosition.row,
          filePath: this.parseContext.fileRelativePath,
          language: "typescript",
          nodeId: uuidv4(),
          treeSitterType: child.type,
          sourceText: child.text,
          nodeKind: "unknown",
          startLine: child.startPosition.row,
          parentNodeId: parentNode.nodeId,
          parentTreeSitterType: node.type,
          startIndex: child.startIndex,
          endIndex: child.endIndex,
        };
        void unknownNode;
      }

      await this.walkTree(child, nextParentNode);
    }
  }

  async parseInterface(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<InterfaceNode> {
    const { v4: uuidv4 } = await import("uuid");
    const nameNode = node.childForFieldName("name");
    const bodyNode = node.childForFieldName("body");
    const typeParametersNode = node.childForFieldName("type_parameters");

    const interfaceNode: InterfaceNode = {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      nodeKind: "interface",
      parentNodeId: parentNode.nodeId,
      name: nameNode?.text ?? "anonymous_interface",
      qualifiedName: nameNode?.text ?? "anonymous_interface",
      typeParameters: this.extractTypeParameters(typeParametersNode?.text),
      extendsTypes: this.extractExtendsTypes(node),
      members: [],
      sourceText: node.text,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };

    if (bodyNode) {
      for (const member of bodyNode.children) {
        if (!member.isNamed) {
          continue;
        }

        interfaceNode.members.push(
          await this.parseInterfaceMember(member, interfaceNode),
        );
      }
    }

    return interfaceNode;
  }

  async parseInterfaceMember(
    node: TreeSitterParser.SyntaxNode,
    parentNode: InterfaceNode,
  ): Promise<InterfaceMemberNode> {
    const { v4: uuidv4 } = await import("uuid");
    const nameNode = node.childForFieldName("name");
    const typeNode = node.childForFieldName("type");

    let memberKind: InterfaceMemberNode["memberKind"] = "property";
    if (node.type === "method_signature") {
      memberKind = "method";
    } else if (node.type === "index_signature") {
      memberKind = "index";
    } else if (node.type === "call_signature") {
      memberKind = "call";
    } else if (node.type === "construct_signature") {
      memberKind = "construct";
    }

    return {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      nodeKind: "interfaceMember",
      parentNodeId: parentNode.nodeId,
      name: nameNode?.text ?? node.type,
      memberKind,
      typeText: typeNode?.text,
      optional: node.type === "property_signature" && node.text.includes("?:"),
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };
  }

  async parseTypeAlias(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<TypeAliasNode> {
    const { v4: uuidv4 } = await import("uuid");
    const nameNode = node.childForFieldName("name");
    const valueNode = node.childForFieldName("value");
    const typeParametersNode = node.childForFieldName("type_parameters");

    return {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      nodeKind: "typeAlias",
      parentNodeId: parentNode.nodeId,
      name: nameNode?.text ?? "anonymous_type_alias",
      qualifiedName: nameNode?.text ?? "anonymous_type_alias",
      typeParameters: this.extractTypeParameters(typeParametersNode?.text),
      value: valueNode?.text ?? "unknown",
      sourceText: node.text,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };
  }

  async parseEnum(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<EnumNode> {
    const { v4: uuidv4 } = await import("uuid");
    const nameNode = node.childForFieldName("name");
    const bodyNode = node.childForFieldName("body");

    const enumNode: EnumNode = {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      nodeKind: "enum",
      parentNodeId: parentNode.nodeId,
      name: nameNode?.text ?? "anonymous_enum",
      qualifiedName: nameNode?.text ?? "anonymous_enum",
      isConst: node.text.startsWith("const enum"),
      members: [],
      sourceText: node.text,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };

    if (bodyNode) {
      for (const child of bodyNode.children) {
        if (!child.isNamed) {
          continue;
        }

        const member = await this.parseEnumMember(child, enumNode);
        enumNode.members.push(member);
      }
    }

    return enumNode;
  }

  async parseEnumMember(
    node: TreeSitterParser.SyntaxNode,
    parentNode: EnumNode,
  ): Promise<EnumMemberNode> {
    const { v4: uuidv4 } = await import("uuid");

    if (node.type === "enum_assignment") {
      const nameNode = node.childForFieldName("name");
      const valueNode = node.childForFieldName("value");
      return {
        nodeId: uuidv4(),
        filePath: this.parseContext.fileRelativePath,
        language: "typescript",
        nodeKind: "enumMember",
        parentNodeId: parentNode.nodeId,
        name: nameNode?.text ?? "unknown_enum_member",
        value: valueNode?.text,
        startLine: node.startPosition.row,
        endLine: node.endPosition.row,
        startIndex: node.startIndex,
        endIndex: node.endIndex,
      };
    }

    return {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      nodeKind: "enumMember",
      parentNodeId: parentNode.nodeId,
      name: node.text,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };
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
              language: "typescript",
              nodeKind: "importSpecifier",
              parentNodeId: parentNode.nodeId,
              importedName,
              localName,
              startLine: specifierNode.startPosition.row,
              endLine: specifierNode.endPosition.row,
              startIndex: specifierNode.startIndex,
              endIndex: specifierNode.endIndex,
            });
          }
        }
      }
    }

    return {
      nodeId: uuidv4(),
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      nodeKind: "import",
      parentNodeId: parentNode.nodeId,
      source: this.stripQuotes(sourceNode?.text) || "",
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      defaultImport,
      namespaceImport,
      specifiers,
      sourceText: node.text,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
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
          language: "typescript",
          nodeKind: "exportSpecifier",
          parentNodeId: parentNode.nodeId,
          exportedName,
          localName,
          startLine: child.startPosition.row,
          endLine: child.endPosition.row,
          startIndex: child.startIndex,
          endIndex: child.endIndex,
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
      language: "typescript",
      nodeKind: "export",
      parentNodeId: parentNode.nodeId,
      exportKind,
      source: this.stripQuotes(sourceNode?.text),
      declarationText: declarationNode?.text ?? valueNode?.text,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      specifiers,
      sourceText: node.text,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };
  }

  async parseClass(
    node: TreeSitterParser.SyntaxNode,
    parentNode: AbstractNode,
  ): Promise<ClassNode> {
    if (
      node.type !== "class_declaration" &&
      node.type !== "abstract_class_declaration" &&
      node.type !== "class"
    ) {
      throw new Error(`Expected a class node, but got ${node.type}`);
    }

    const { v4: uuidv4 } = await import("uuid");
    const classNameNode = node.childForFieldName("name");
    const className = classNameNode?.text ?? "anonymous_class";

    const classNode: ClassNode = {
      nodeId: uuidv4(),
      nodeKind: "class",
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      parentNodeId: parentNode.nodeId,
      name: className,
      qualifiedName: className,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      modifiers: node.type === "abstract_class_declaration" ? ["abstract"] : [],
      properties: [],
      methods: [],
      constructors: [],
      sourceText: node.text,
      typeParameters: this.extractTypeParameters(
        node.childForFieldName("type_parameters")?.text,
      ),
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };

    const heritageNode = node.children.find(
      (child) => child.type === "class_heritage",
    );
    const extendsNode = heritageNode?.children.find(
      (child) => child.type === "extends_clause",
    );
    if (extendsNode) {
      classNode.extends =
        extendsNode.childForFieldName("value")?.text ??
        extendsNode.text.replace(/^extends\s+/, "");
    }

    const classBodyNode = node.childForFieldName("body");
    if (!classBodyNode) {
      return classNode;
    }

    for (const member of classBodyNode.children) {
      if (member.type === "method_definition") {
        const methodNode = await this.parseMethodDefinition(member, classNode);
        this.irNodes.push(methodNode);

        const methodBodyNode = member.childForFieldName("body");
        if (methodBodyNode) {
          await this.walkTree(methodBodyNode, methodNode);
        }

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
        const propertyNode = await this.parseClassProperty(member);
        classNode.properties.push(propertyNode);
        this.irNodes.push(propertyNode);

        const initializerNode = member.childForFieldName("value");
        if (initializerNode) {
          await this.walkTree(initializerNode, propertyNode);
        }
      }

      if (member.type === "class_static_block") {
        await this.walkTree(member, classNode);
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
      node.type !== "variable_declaration"
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
      language: "typescript",
      nodeKind: "variableDeclaration",
      parentNodeId: parentNode.nodeId,
      declarationKind,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      declarators: [],
      sourceText: node.text,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
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
      language: "typescript",
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
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };

    if (!requireCall) {
      return { declarator: declaratorNode };
    }

    return {
      declarator: declaratorNode,
      requireNode: {
        nodeId: uuidv4(),
        filePath: this.parseContext.fileRelativePath,
        language: "typescript",
        nodeKind: "require",
        parentNodeId: declaratorNode.nodeId,
        moduleName: requireCall.moduleName,
        assignedName: declaratorName,
        startLine: valueNode?.startPosition.row ?? node.startPosition.row,
        endLine: valueNode?.endPosition.row ?? node.endPosition.row,
        sourceText: valueNode?.text ?? node.text,
        startIndex: valueNode?.startIndex ?? node.startIndex,
        endIndex: valueNode?.endIndex ?? node.endIndex,
      },
    };
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
      returnType: "any",
      modifiers: [],
      nodeKind: "function",
      language: "typescript",
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
      language: "typescript",
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
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };
  }

  async parseClassProperty(
    node: TreeSitterParser.SyntaxNode,
  ): Promise<ClassPropertyNode> {
    const { v4: uuidv4 } = await import("uuid");
    const nameNode =
      node.childForFieldName("name") || node.childForFieldName("property");
    const valueNode = node.childForFieldName("value");

    const propertyName = nameNode?.text ?? "unknown_property";
    const modifiers: string[] = [];

    if (node.text.startsWith("static ")) {
      modifiers.push("static");
    }

    if (node.text.startsWith("readonly ")) {
      modifiers.push("readonly");
    }

    return {
      name: propertyName,
      type: "any",
      modifiers,
      static: modifiers.includes("static"),
      readonly: modifiers.includes("readonly"),
      defaultValue: valueNode?.text,
      filePath: this.parseContext.fileRelativePath,
      language: "typescript",
      nodeId: uuidv4(),
      nodeKind: "property",
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };
  }

  async extractParameters(
    node: TreeSitterParser.SyntaxNode,
  ): Promise<ParameterNode[]> {
    const parameters: ParameterNode[] = [];
    const { v4: uuidv4 } = await import("uuid");

    for (const param of node.children) {
      if (!param.isNamed) {
        continue;
      }

      if (
        param.type === "required_parameter" ||
        param.type === "optional_parameter"
      ) {
        const nameNode =
          param.childForFieldName("name") || param.childForFieldName("pattern");
        const valueNode = param.childForFieldName("value");

        const nameText = nameNode?.text ?? "unknown_parameter";
        const isVariadic =
          nameNode?.type === "rest_pattern" || nameText.startsWith("...");

        parameters.push({
          name: nameText.replace(/^\.\.\./, ""),
          type: "any",
          optional: param.type === "optional_parameter",
          defaultValue: valueNode?.text,
          variadic: isVariadic,
          filePath: this.parseContext.fileRelativePath,
          language: "typescript",
          nodeKind: "parameter",
          nodeId: uuidv4(),
          startLine: param.startPosition.row,
          endLine: param.endPosition.row,
          startIndex: param.startIndex,
          endIndex: param.endIndex,
        });
        continue;
      }

      if (param.type == "identifier") {
        parameters.push({
          name: param.text,
          type: "any",
          filePath: this.parseContext.fileRelativePath,
          language: "typescript",
          nodeKind: "parameter",
          nodeId: uuidv4(),
          startLine: param.startPosition.row,
          endLine: param.endPosition.row,
          startIndex: param.startIndex,
          endIndex: param.endIndex,
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
            language: "typescript",
            nodeId: uuidv4(),
            nodeKind: "parameter",
            startLine: param.startPosition.row,
            endLine: param.endPosition.row,
            startIndex: param.startIndex,
            endIndex: param.endIndex,
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
            language: "typescript",
            nodeId: uuidv4(),
            nodeKind: "parameter",
            startLine: param.startPosition.row,
            endLine: param.endPosition.row,
            startIndex: param.startIndex,
            endIndex: param.endIndex,
          });
        }
        continue;
      }

      parameters.push({
        name: param.text,
        type: "any",
        filePath: this.parseContext.fileRelativePath,
        language: "typescript",
        nodeId: uuidv4(),
        nodeKind: "parameter",
        startLine: param.startPosition.row,
        endLine: param.endPosition.row,
        startIndex: param.startIndex,
        endIndex: param.endIndex,
      });
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
      language: "typescript",
      filePath: this.parseContext.fileRelativePath,
      parentNodeId: parentNode.nodeId,
      nodeKind: "statement",
      stmtType: mapStatementType(node.type as TreeSitterStatementType),
      text: node.text,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
    };

    return statementNode;
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

  mapVariableDeclarationKind(
    nodeType: TreeSitterParser.SyntaxNode["type"],
    kindText?: string,
  ): VariableDeclarationKind {
    if (nodeType === "variable_declaration") {
      return "var";
    }

    return kindText === "const" ? "const" : "let";
  }

  extractTypeParameters(typeParametersText?: string): string[] | undefined {
    if (!typeParametersText) {
      return undefined;
    }

    const text = typeParametersText.trim();
    if (!text.startsWith("<") || !text.endsWith(">")) {
      return [text];
    }

    const raw = text.slice(1, -1).trim();
    if (!raw) {
      return [];
    }

    return raw.split(",").map((part) => part.trim());
  }

  extractExtendsTypes(node: TreeSitterParser.SyntaxNode): string[] {
    const extendsClause = node.children.find(
      (child) => child.type === "extends_type_clause",
    );

    if (!extendsClause) {
      return [];
    }

    return extendsClause.children
      .filter((child) => child.isNamed)
      .map((child) => child.text);
  }

  stripQuotes(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.replace(/^['\"]|['\"]$/g, "");
  }
}

export { Parser };
