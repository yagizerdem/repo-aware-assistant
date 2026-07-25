import fs from "node:fs/promises";
import path from "node:path";

interface AllowedFile {
  name: string;
  parentPath: string;
  absolutePath: string;
  extension: string;
}

async function getAllowedFiles(
  baseDir: string,
  allowedExtensions: readonly string[] = [".js", ".ts"],
): Promise<AllowedFile[]> {
  const rootPath = path.resolve(baseDir);
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files: AllowedFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subDirFiles = await getAllowedFiles(
        path.join(rootPath, entry.name),
        allowedExtensions,
      );
      files.push(...subDirFiles);
    }

    if (
      entry.isFile() &&
      allowedExtensions.includes(path.extname(entry.name))
    ) {
      files.push({
        name: entry.name,
        parentPath: rootPath,
        absolutePath: path.join(rootPath, entry.name),
        extension: path.extname(entry.name),
      });
    }
  }

  return files;
}

export { getAllowedFiles };
export type { AllowedFile };
