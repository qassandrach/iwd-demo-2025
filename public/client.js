// public/client.js
const socket = io(); // Connect to the server

const messagesList = document.getElementById('messages');

// Function to add a message to the list
function addMessageToList(message) {
    const item = document.createElement('li');
    item.textContent = message.text;
    item.setAttribute('data-id', message.id); // Optional: useful for updates/deletions later
    messagesList.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight); // Scroll to bottom
}

// Listen for 'display_message' events from the server
socket.on('display_message', (messageData) => {
    addMessageToList(messageData);
});

// Listen for 'load_messages' event when connecting
socket.on('load_messages', (existingMessages) => {
    messagesList.innerHTML = ''; // Clear any existing list items
    existingMessages.forEach(addMessageToList);
});

// Handle connection errors (optional)
socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
  // Maybe display an error to the user
});
