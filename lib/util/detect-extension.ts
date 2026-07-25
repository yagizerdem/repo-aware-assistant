import { SupportedLanguage } from "../types/supported-language";
import { extname } from "path";

function detectExtension(fileType: SupportedLanguage): string {
  switch (fileType) {
    case "javascript":
      return ".js";
    case "typescript":
      return ".ts";
    case "java":
      return ".java";
    case "csharp":
      return ".cs";
    case "python":
      return ".py";
    case "cpp":
      return ".cpp";
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

function detectExtensionFromPath(path: string): string {
  const extension = extname(path);
  return extension;
}

export { detectExtension, detectExtensionFromPath };
