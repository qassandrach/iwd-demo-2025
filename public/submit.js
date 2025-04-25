// public/submit.js
const socket = io(); // Connect to the server

const form = document.getElementById('message-form');
const input = document.getElementById('message-input');
const status = document.getElementById('status');

form.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    if (input.value) {
        // Send the message content to the server via WebSocket
        socket.emit('new_message', input.value);
        input.value = ''; // Clear the input field
        status.textContent = 'Message sent!';
        setTimeout(() => status.textContent = '', 2000); // Clear status after 2s
    }
});

// Handle connection errors (optional)
socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
  status.textContent = 'Failed to connect to server.';
});

socket.on('connect', () => {
    status.textContent = 'Connected.';
     setTimeout(() => status.textContent = '', 2000);
});

socket.on('disconnect', () => {
    status.textContent = 'Disconnected from server.';
});
