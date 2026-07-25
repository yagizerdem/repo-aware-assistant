import express from "express";

import { parser } from "./lib/indexing/graph-builder";
import { getAllowedFiles } from "./lib/indexing/repo";

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

const sourceCode = "let x = 1; console.log(x);";
parser.parse(sourceCode);

getAllowedFiles("./dev/null").then((files) => {
  console.log(files.at(0));
});

export { app };
