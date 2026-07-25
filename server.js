const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Hello from JavaScript and Express.js!",
  });
});

app.listen(PORT, () => {
  console.log(`Server effectively running on port: http://localhost:${PORT}`);
});
