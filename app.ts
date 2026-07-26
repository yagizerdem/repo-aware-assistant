import express from "express";

import { Parser as TsParser } from "./lib/indexing/ts-parser/parser";
import { ParseContext } from "./lib/indexing/parse-context";
import { getAllowedFiles } from "./lib/indexing/repo";
import { getFileSize, getLineCount } from "./lib/util/file-util";
import fs from "fs";

// getAllowedFiles("./dev/null", "./dev/null", [".js", ".ts"]).then(
//   async (files) => {
//     const allowedFile = files.at(0);
//     console.log("Allowed file:", allowedFile);
//     if (allowedFile) {
//       console.log("File size:", await getLineCount(allowedFile.absolutePath));
//     }
//   },
// );

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

const data = fs.readFileSync("./resources/sample_ts_program.txt", "utf-8");

const sourceCode = data;

const context: ParseContext = {
  id: "example-id",
  fileAbsolutePath: "example-file-path",
  fileRelativePath: "example-file-relative-path",
  lineCount: 10,
  sizeInBytes: 10,
  fileName: "example-file-name",
  fileContent: sourceCode,
};

const parser = new TsParser(context);

async function runParser() {
  await parser.parse();
  // console.log(
  //   "Parsed IR Nodes:",
  //   parser.irNodes.map((node) => node),
  // );
  const f = parser.irNodes.map((node) => node);
  fs.writeFileSync(
    "./resources/parsed_ir_nodes.txt",
    JSON.stringify(f, null, 2),
  );
}

runParser();

export { app };
