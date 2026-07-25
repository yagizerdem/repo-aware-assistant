import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";

const parser = new Parser();
parser.setLanguage(JavaScript as unknown as Parser.Language);

export { parser };
