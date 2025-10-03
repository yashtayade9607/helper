const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// -----------------------------
// Middleware
// -----------------------------
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// Global Variables
// -----------------------------
let userVal = 0;
let mcqSeq = 0;
let mcqTimestamp = null;

let codeMsg = '';
let codeCount = 0;
let codeTimestamp = null;

let latestScreenData = null;

// -----------------------------
// Socket.IO Connection Handling
// -----------------------------
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    // Send latest screen data to newly connected client
    if (latestScreenData) {
        socket.emit('screen-data', latestScreenData);
    }
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// -----------------------------
// MCQ Routes
// -----------------------------
app.post("/mcq", (req, res) => {
    userVal = req.body.mcq;
    mcqSeq++;
    mcqTimestamp = new Date().toISOString();
    console.log("MCQ Received:", req.body.mcq);
    res.send("MCQ sent to User");
});

app.get("/mcq", (req, res) => {
    res.json({
        userVal,
        seq: mcqSeq,
        time: mcqTimestamp
    });
});

// -----------------------------
// Code Routes
// -----------------------------
app.post("/code", (req, res) => {
    codeMsg = req.body.code;
    codeCount++;
    codeTimestamp = new Date().toISOString();
    console.log("Code Received:", req.body.code);
    res.send("Code sent to User");
});

app.get("/code", (req, res) => {
    res.json({
        msg: codeMsg,
        msgcount: codeCount,
        time: codeTimestamp
    });
});

// -----------------------------
// Screen Data Route
// -----------------------------
app.post('/screen-data', (req, res) => {
    try {
        const { screen_image, extracted_text, timestamp } = req.body;
        
        console.log('📸 Screen data received');
        console.log('📝 Extracted text length:', extracted_text.length);
        
        // Store latest screen data
        latestScreenData = {
            screen_image,
            extracted_text,
            timestamp
        };
        
        // Broadcast to all connected clients
        io.emit('screen-data', latestScreenData);
        
        res.status(200).json({ status: 'screen data received' });
    } catch (error) {
        console.error('Error processing screen data:', error);
        res.status(500).json({ error: 'Failed to process screen data' });
    }
});

// -----------------------------
// Get Latest Screen Data
// -----------------------------
app.get('/screen-data', (req, res) => {
    if (latestScreenData) {
        res.json(latestScreenData);
    } else {
        res.status(404).json({ error: 'No screen data available' });
    }
});

// -----------------------------
// Acknowledgment Route
// -----------------------------
app.post('/msg-ack', (req, res) => {
    const { ack } = req.body;
    
    if (ack === true) {
        console.log('✅ Received acknowledgment from client - typing completed');
        
        io.emit('acknowledgment', {
            message: 'Typing completed successfully',
            timestamp: new Date().toISOString(),
            status: 'completed'
        });
        
        res.status(200).json({ status: 'acknowledgment received' });
    } else {
        console.log('⚠️  Invalid acknowledgment received');
        res.status(400).json({ error: 'Invalid acknowledgment' });
    }
});

// -----------------------------
// Start Server
// -----------------------------
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});