import fs from "node:fs/promises";
import path from "node:path";

interface AllowedFile {
  name: string;
  parentPath: string;
  absolutePath: string;
  extension: string;
  relativePath: string;
}

async function getAllowedFiles(
  basePath: string,
  currentDir: string,
  allowedExtensions: readonly string[] = [".js", ".ts"],
): Promise<AllowedFile[]> {
  const rootPath = path.resolve(currentDir);
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files: AllowedFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subDirFiles = await getAllowedFiles(
        basePath,
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
        absolutePath: path.normalize(
          path.join(rootPath, entry.name).split(path.sep).join(path.posix.sep),
        ),
        relativePath: path.normalize(
          path.relative(
            basePath,
            path
              .join(rootPath, entry.name)
              .split(path.sep)
              .join(path.posix.sep),
          ),
        ),
        extension: path.extname(entry.name),
      });
    }
  }

  return files;
}

export { getAllowedFiles };
export type { AllowedFile };
