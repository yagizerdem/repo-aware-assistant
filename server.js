const { app } = require("./app");

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Hello from JavaScript and Express.js!",
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(
    `Server effectively running on port: http://localhost:${process.env.PORT || 3000}`,
  );
});
