// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server); // Initialize Socket.IO with the HTTP server

const PORT = process.env.PORT || 8080;

// Serve static files (HTML, CSS, client-side JS)
app.use(express.static(path.join(__dirname, 'public')));

// Store messages in memory (simple approach, messages lost on restart)
let messages = [];

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send existing messages to the newly connected client (audience view)
    socket.emit('load_messages', messages);

    // Listen for new messages from participants
    socket.on('new_message', (msg) => {
        console.log('Message received:', msg);
        if (msg && msg.trim().length > 0) { // Basic validation
            const messageData = { id: Date.now(), text: msg }; // Add a unique ID (timestamp is simple)
            messages.push(messageData);
            // Broadcast the new message to ALL connected clients (audience views)
            io.emit('display_message', messageData);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Basic route for the participant input page
app.get('/submit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'submit.html'));
});

// Basic route for the audience display page (can also be the root '/')
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});
