const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

const tempDir = path.join(__dirname, 'temp');
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

app.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const tempFilePath = path.join(tempDir, req.file.originalname);

        const pythonProcess = spawn('python', ['colab_script.py', 'some_argument']);


        let result = '';
        pythonProcess.stdout.on('data', data => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', err => {
            console.error(`Python error: ${err.toString()}`);
        });

        pythonProcess.on('close', code => {
            if (code === 0) {
                try {
                    const output = JSON.parse(result);
                    res.json({ success: true, objects: output.detected_objects });
                } catch (err) {
                    console.error(`JSON parse error: ${err}`);
                    res.status(500).json({ success: false, message: 'Invalid JSON output' });
                }
            } else {
                res.status(500).json({ success: false, message: 'Error processing image' });
            }
        });
    } catch (err) {
        console.error(`Server error: ${err}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`);
});