const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

const cors = require('cors');
app.use(cors());

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Endpoint to receive data from Python
app.post("/process-data", (req, res) => {
    const { data } = req.body;

    console.log("Received data from Python:", data);

    // Respond to Python
    res.json({ message: "Data received successfully!", receivedData: data });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
