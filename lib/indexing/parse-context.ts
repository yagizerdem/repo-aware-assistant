interface ParseContext {
  id: string;
  fileAbsolutePath: string;
  fileRelativePath: string;
  fileName: string;
  lineCount: number;
  sizeInBytes: number;
  fileContent: string;
}

export type { ParseContext };
