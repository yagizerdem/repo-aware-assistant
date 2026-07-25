import express from "express";

import { Parser as JsParser } from "./lib/indexing/js-parser/parser";
import { ParseContext } from "./lib/indexing/parse-context";
import { getAllowedFiles } from "./lib/indexing/repo";
import { getFileSize, getLineCount } from "./lib/util/file-util";

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

const sourceCode = `
function bubbleSort(arr, k , ...nums) {
  const result = [...arr]; // Orijinal diziyi değiştirmemek için kopyala

  for (let i = 0; i < result.length - 1; i++) {
    let swapped = false;

    for (let j = 0; j < result.length - 1 - i; j++) {
      if (result[j] > result[j + 1]) {
        [result[j], result[j + 1]] = [result[j + 1], result[j]];
        swapped = true;
      }
    }

    // Bu turda hiç yer değiştirme olmadıysa dizi zaten sıralıdır.
    if (!swapped) {
      break;
    }
  }

  return result;
}

// Örnek kullanım
const numbers = [5, 1, 4, 2, 8];

console.log(bubbleSort(numbers)); // [1, 2, 4, 5, 8]
console.log(numbers);             // [5, 1, 4, 2, 8]

class Test {
  constructor() {
    this.name = "Test";
  }

  greet() {
    console.log("Hello from Test class!");
  }
}

`.trim();

const context: ParseContext = {
  id: "example-id",
  repoId: "example-repo-id",
  fileAbsolutePath: "example-file-path",
  fileRelativePath: "example-file-relative-path",
  lineCount: 10,
  sizeInBytes: 10,
  fileName: "example-file-name",
  fileContent: sourceCode,
};

const parser = new JsParser(context);

async function runParser() {
  await parser.parse();
  console.log("Parsed IR Nodes:", parser.irNodes);
}

runParser();

export { app };
