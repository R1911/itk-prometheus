const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");

const port = 9099;

const app = express();
app.use(bodyParser.json());

app.post("/alert", (req, res) => {
	console.log(`incoming request: `, req.body);
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});