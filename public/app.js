// public/app.js
const socket = io(); // Connect to the server

// --- DOM Elements ---
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesList = document.getElementById('messages');
const statusDisplay = document.getElementById('status'); // Renamed for clarity

// --- Helper Functions ---

/**
 * Adds a message object to the messages list in the DOM.
 * @param {object} message - The message object { id: number, text: string }
 */
function addMessageToList(message) {
    if (!message || typeof message.text !== 'string') {
        console.error('Invalid message object received:', message);
        return; // Don't add invalid messages
    }
    const item = document.createElement('li');
    item.textContent = message.text;
    item.setAttribute('data-id', message.id); // Useful for potential future features
    messagesList.appendChild(item);
    // Consider scrolling only if the user is already near the bottom
    // window.scrollTo(0, document.body.scrollHeight); // Scroll to bottom
    scrollToBottom(); // Use a potentially smarter scroll function
}

/**
 * Scrolls the window to the bottom, potentially only if the user is already near the bottom.
 */
function scrollToBottom() {
    // Simple scroll:
    window.scrollTo(0, document.body.scrollHeight);

    // Optional: More complex scroll (only scroll if user is near the bottom)
    // const scrollThreshold = 100; // Pixels from bottom
    // if (window.innerHeight + window.scrollY >= document.body.offsetHeight - scrollThreshold) {
    //     window.scrollTo(0, document.body.scrollHeight);
    // }
}

/**
 * Updates the status display and clears it after a delay.
 * @param {string} text - The text to display.
 * @param {number} [delay=2000] - Milliseconds before clearing the status.
 */
function updateStatus(text, delay = 2000) {
    if (statusDisplay) {
        statusDisplay.textContent = text;
        if (delay > 0) {
            setTimeout(() => {
                if (statusDisplay.textContent === text) { // Clear only if text hasn't changed
                   statusDisplay.textContent = '';
                }
            }, delay);
        }
    }
}


// --- Event Listeners ---

// Handle form submission (sending messages)
if (messageForm && messageInput) {
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload
        const messageText = messageInput.value.trim(); // Trim whitespace
        if (messageText) {
            // Send the message content to the server via WebSocket
            socket.emit('new_message', messageText);
            messageInput.value = ''; // Clear the input field
            updateStatus('Message sent!');
            messageInput.focus(); // Keep focus on the input field
        }
    });
} else {
    console.error("Message form or input element not found!");
}

// --- Socket.IO Event Handlers ---

// Handle connection established
socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
    updateStatus('Connected.');
    // No need to explicitly request messages here,
    // the server sends 'load_messages' automatically on connection.
});

// Handle receiving the list of existing messages upon connection
socket.on('load_messages', (existingMessages) => {
    console.log('Loading existing messages:', existingMessages);
    if (messagesList) {
        messagesList.innerHTML = ''; // Clear any existing list items
        if (Array.isArray(existingMessages)) {
            existingMessages.forEach(addMessageToList);
        } else {
            console.error('Received non-array for existing messages:', existingMessages);
        }
    } else {
        console.error("Messages list element not found!");
    }
});

// Handle receiving a new message to display
socket.on('display_message', (messageData) => {
    console.log('New message received:', messageData);
    addMessageToList(messageData);
});

// Handle disconnection
socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    updateStatus('Disconnected from server.', 0); // Keep disconnect message visible
});

// Handle connection errors (consolidated)
socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
  updateStatus(`Connection failed: ${err.message}`, 0); // Keep error visible
});

// Optional: Handle server reconnection attempts
socket.io.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Reconnection attempt ${attemptNumber}...`);
    updateStatus(`Trying to reconnect (${attemptNumber})...`, 0);
});

socket.io.on('reconnect', (attemptNumber) => {
    console.log(`Successfully reconnected after ${attemptNumber} attempts.`);
    updateStatus('Reconnected.', 2000);
    // Server should automatically resend 'load_messages' if needed,
    // or you might need custom logic depending on server setup.
});

socket.io.on('reconnect_failed', () => {
    console.error('Reconnection failed.');
    updateStatus('Could not reconnect to the server.', 0);
});
