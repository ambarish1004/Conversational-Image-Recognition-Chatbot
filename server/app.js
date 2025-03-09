const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const cors = require("cors");
const axios = require("axios"); // For external knowledge-based API calls

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Global variable to store last detected objects and their colors
global.lastDetectedObjects = [];
global.lastProcessedImage = "";

// **UPLOAD IMAGE & PROCESS OBJECT DETECTION**
app.post("/upload", upload.single("image"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const tempFilePath = path.join(tempDir, req.file.filename);
        const pythonProcess = spawn("python", ["colab_script.py", tempFilePath]);

        let result = "";
        pythonProcess.stdout.on("data", data => {
            result += data.toString();
        });

        pythonProcess.stderr.on("data", err => {
            console.error(`Python error: ${err.toString()}`);
        });

        pythonProcess.on("close", code => {
            if (code === 0) {
                try {
                    const jsonMatch = result.match(/\{.*\}/s);
                    if (!jsonMatch) {
                        throw new Error("No valid JSON found in Python script output.");
                    }
                    
                    const output = JSON.parse(jsonMatch[0]); // Extract JSON part
                    console.log("Parsed Python Output:", output);

                    global.lastDetectedObjects = output.detected_objects || [];
                    global.lastProcessedImage = output.processed_image || "";

                    const processedImagePath = output.processed_image
                        ? `/processed/${path.basename(output.processed_image)}`
                        : null;

                    res.json({
                        success: true,
                        objects: output.detected_objects,
                        processed_image: processedImagePath
                    });
                } catch (err) {
                    console.error(`JSON parse error: ${err.message}`);
                    res.status(500).json({
                        success: false,
                        message: "Invalid JSON output from Python script"
                    });
                }
            } else {
                res.status(500).json({ success: false, message: "Error processing image" });
            }
        });
    } catch (err) {
        console.error(`Server error: ${err}`);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// **HANDLE USER QUESTIONS**
app.post("/ask-question", async (req, res) => {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
        return res.status(400).json({ success: false, message: "Invalid question input" });
    }

    // Get detected objects & colors
    const detectedObjects = global.lastDetectedObjects || [];
    const detectedColors = global.lastDetectedColors || {};

    // Answer basic object detection questions
    if (question.toLowerCase().includes("what objects") || question.toLowerCase().includes("detected")) {
        return res.json({ success: true, answer: `I detected these objects: ${detectedObjects.join(", ")}.` });
    }

    // Answer counting questions
    if (question.toLowerCase().includes("how many")) {
        const counts = detectedObjects.reduce((acc, obj) => {
            acc[obj] = (acc[obj] || 0) + 1;
            return acc;
        }, {});

        let answer = "Count of detected objects:\n";
        for (const [object, count] of Object.entries(counts)) {
            answer += `${object}: ${count}\n`;
        }
        return res.json({ success: true, answer });
    }

    // Answer object presence questions
    if (question.toLowerCase().includes("is there a")) {
        const objectToFind = question.toLowerCase().replace("is there a", "").trim();
        const answer = detectedObjects.includes(objectToFind) ? `Yes, a ${objectToFind} is detected.` : `No, a ${objectToFind} is not detected.`;
        return res.json({ success: true, answer });
    }

    // Answer color-related questions
    if (question.toLowerCase().includes("color of")) {
        const objectToFind = question.toLowerCase().replace("what is the color of", "").trim();
        const answer = detectedColors[objectToFind] ? `The ${objectToFind} is ${detectedColors[objectToFind]}.` : `I don't have color information for ${objectToFind}.`;
        return res.json({ success: true, answer });
    }

    // **General knowledge-based AI response using an external API (Optional)**
    try {
        const aiResponse = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4",
            messages: [{ role: "user", content: question }]
        }, {
            headers: { "Authorization": `Bearer YOUR_OPENAI_API_KEY` }
        });

        return res.json({ success: true, answer: aiResponse.data.choices[0].message.content });
    } catch (err) {
        console.error("AI API error:", err);
        return res.json({ success: true, answer: "I'm unable to answer that question at the moment." });
    }
});

app.use("/processed", express.static(tempDir));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});