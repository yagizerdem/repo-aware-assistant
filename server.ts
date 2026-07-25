import { app } from "./app";

const port = Number(process.env.PORT) || 3000;

app.get("/", (_req, res) => {
  res.json({
    status: "success",
    message: "Hello from TypeScript and Express.js!",
  });
});

app.listen(port, () => {
  console.log(`Server effectively running on port: http://localhost:${port}`);
});
