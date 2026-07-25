import fs from "fs/promises";

async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

async function getLineCount(filePath: string): Promise<number> {
  const content = await fs.readFile(filePath, "utf-8");
  return content.split("\n").length;
}

export { getFileSize, getLineCount };
