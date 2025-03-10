// const express = require("express");
// const bodyParser = require("body-parser");
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");
// const { spawn } = require("child_process");
// const cors = require("cors");

// const app = express();
// const port = 3001;

// app.use(cors());
// app.use(express.json()); // Allow JSON requests
// app.use(express.static(path.join(__dirname, "../public")));

// const tempDir = path.join(__dirname, "temp");
// if (!fs.existsSync(tempDir)) {
//     fs.mkdirSync(tempDir);
// }

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, tempDir);
//     },
//     filename: (req, file, cb) => {
//         cb(null, file.originalname);
//     }
// });

// const upload = multer({ storage: storage });

// // Endpoint for uploading images
// app.post("/upload", upload.single("image"), (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ success: false, message: "No file uploaded" });
//         }

//         const tempFilePath = path.join(tempDir, req.file.filename);
//         const pythonProcess = spawn("python", ["colab_script.py", tempFilePath]);

//         let result = "";
//         pythonProcess.stdout.on("data", data => {
//             result += data.toString();
//         });

//         pythonProcess.stderr.on("data", err => {
//             console.error(`Python error: ${err.toString()}`);
//         });

//         pythonProcess.on("close", code => {
//             if (code === 0) {
//                 try {
//                     const output = JSON.parse(result);
//                     const processedImagePath = output.processed_image ? `/processed/${path.basename(output.processed_image)}` : null;
                    
//                     res.json({ 
//                         success: true, 
//                         objects: output.detected_objects, 
//                         processed_image: processedImagePath 
//                     });
//                 } catch (err) {
//                     console.error(`JSON parse error: ${err}`);
//                     res.status(500).json({ success: false, message: "Invalid JSON output" });
//                 }
//             } else {
//                 res.status(500).json({ success: false, message: "Error processing image" });
//             }
//         });
//     } catch (err) {
//         console.error(`Server error: ${err}`);
//         res.status(500).json({ success: false, message: "Server error" });
//     }
// });

// // Endpoint to handle user questions
// app.post("/ask-question", (req, res) => {
//     const { question } = req.body;

//     if (!question) {
//         return res.status(400).json({ success: false, message: "No question provided" });
//     }

//     // Mock AI response (Replace with real AI logic if needed)
//     const answer = `AI Answer: The detected objects are ${question}.`;

//     res.json({ success: true, answer });
// });

// app.use("/processed", express.static(tempDir));

// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
// });
