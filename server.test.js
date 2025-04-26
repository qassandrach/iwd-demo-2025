// server.test.js
const request = require('supertest');
const { io: Client } = require('socket.io-client');
const { server, messages, io: serverIo } = require('./server'); // Import exported items

let serverAddress;
let httpServer;
let clientSocket1;
let clientSocket2;

// --- Test Setup & Teardown ---

beforeAll((done) => {
    // Start the server on an ephemeral port (port 0)
    httpServer = server.listen(0, () => {
        const port = httpServer.address().port;
        serverAddress = `http://localhost:${port}`;
        console.log(`Test server running on ${serverAddress}`);
        done();
    });
});

afterAll((done) => {
    // Close server and Socket.IO connections
    serverIo.close(); // Close the Socket.IO server instance
    httpServer.close(done); // Close the HTTP server
    console.log('Test server stopped.');
});

// Disconnect any clients and clear messages before each test
beforeEach(() => {
    // Reset messages array
    messages.length = 0;
    // Disconnect clients if they are connected
    clientSocket1?.disconnect();
    clientSocket2?.disconnect();
});

// Helper function to connect a client with promises
const connectClient = (options = {}) => {
    return new Promise((resolve, reject) => {
        // Ensure connection to the test server's address
        const socket = Client(serverAddress, {
            reconnection: false, // Disable auto-reconnection for predictable tests
            forceNew: true,      // Ensure a new connection is established
            transports: ['websocket'], // Prefer WebSocket for testing
            timeout: 5000,       // Connection timeout
            ...options
        });

        const connectTimeout = setTimeout(() => reject(new Error('Connection timed out')), 5000);

        socket.on('connect', () => {
            clearTimeout(connectTimeout);
            resolve(socket);
        });

        socket.on('connect_error', (err) => {
            clearTimeout(connectTimeout);
            reject(err);
        });
    });
};


// --- Test Suites ---

describe('HTTP Routes', () => {
    test('GET / should return status 200 and HTML content', async () => {
        const res = await request(httpServer).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toMatch(/html/);
        // You could add more specific checks, e.g., for a title or specific element
        // expect(res.text).toMatch(/<title>Audience View<\/title>/);
    });

    test('GET /submit should return status 200 and HTML content', async () => {
        const res = await request(httpServer).get('/submit');
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toMatch(/html/);
        // expect(res.text).toMatch(/<title>Submit Message<\/title>/);
    });

    test('GET /nonexistent-route should return 404', async () => {
        const res = await request(httpServer).get('/this-route-does-not-exist');
        // Since only static files and specific routes are defined, others should 404
        expect(res.statusCode).toEqual(404);
    });
});

describe('Socket.IO Functionality', () => {

    test('should allow a client to connect', async () => {
        clientSocket1 = await connectClient();
        expect(clientSocket1.connected).toBe(true);
        expect(clientSocket1.id).toBeDefined();
    });

    test('should send existing messages (`load_messages`) upon connection', async () => {
        // Arrange: Add some messages before connecting
        messages.push({ id: 1, text: 'First pre-existing message' });
        messages.push({ id: 2, text: 'Second pre-existing message' });

        const loadMessagesPromise = new Promise(async (resolve) => {
            clientSocket1 = await connectClient();
            clientSocket1.on('load_messages', (receivedMessages) => {
                resolve(receivedMessages);
            });
        });

        // Act & Assert
        await expect(loadMessagesPromise).resolves.toEqual([
            { id: 1, text: 'First pre-existing message' },
            { id: 2, text: 'Second pre-existing message' },
        ]);
    });

    test('should broadcast a `display_message` event when a `new_message` is received', async () => {
        const testMessage = 'Hello World from test!';
        const expectedMessageData = {
            id: expect.any(Number), // ID is a timestamp, check type
            text: testMessage
        };

        // Arrange: Connect two clients
        clientSocket1 = await connectClient();
        clientSocket2 = await connectClient();

        // Set up listener on client 2 BEFORE client 1 emits
        const messageReceivedPromise = new Promise((resolve) => {
            clientSocket2.on('display_message', (msgData) => {
                resolve(msgData);
            });
        });

        // Act: Client 1 sends a message
        clientSocket1.emit('new_message', testMessage);

        // Assert: Client 2 receives the message
        await expect(messageReceivedPromise).resolves.toMatchObject(expectedMessageData);

        // Also check if the message was added to the server's array
        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatchObject(expectedMessageData);
    });

     test('should broadcast `display_message` to the sender as well', async () => {
        const testMessage = 'Message to self';
        const expectedMessageData = { id: expect.any(Number), text: testMessage };

        // Arrange: Connect one client
        clientSocket1 = await connectClient();

        const messageReceivedPromise = new Promise((resolve) => {
            clientSocket1.on('display_message', (msgData) => {
                resolve(msgData);
            });
        });

        // Act: Client 1 sends a message
        clientSocket1.emit('new_message', testMessage);

        // Assert: Client 1 receives its own message via broadcast
        await expect(messageReceivedPromise).resolves.toMatchObject(expectedMessageData);
     });

    test('should NOT broadcast anything if `new_message` is empty or whitespace', async () => {
        // Arrange: Connect two clients
        clientSocket1 = await connectClient();
        clientSocket2 = await connectClient();

        const displayMessageHandler = jest.fn(); // Mock function to track calls
        clientSocket1.on('display_message', displayMessageHandler);
        clientSocket2.on('display_message', displayMessageHandler);

        // Act: Send empty and whitespace messages
        clientSocket1.emit('new_message', '');
        clientSocket1.emit('new_message', '   ');
        clientSocket1.emit('new_message', null); // Test invalid input
        clientSocket1.emit('new_message', undefined); // Test invalid input

        // Assert: Wait a short moment to ensure no messages were broadcast
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

        expect(displayMessageHandler).not.toHaveBeenCalled();
        expect(messages).toHaveLength(0); // No messages should be stored
    });

    test('should handle client disconnection gracefully', async () => {
        // Arrange: Connect a client
        clientSocket1 = await connectClient();
        expect(clientSocket1.connected).toBe(true);

        // Act: Disconnect the client
        clientSocket1.disconnect();

        // Assert: Check connection status after a short delay
        await new Promise(resolve => setTimeout(resolve, 50)); // Allow time for disconnect event
        expect(clientSocket1.connected).toBe(false);
        // We can't easily assert the console log on the server without more complex setup (spies/mocks)
        // But ensuring the disconnect doesn't crash the server or tests is a good sign.
    });
});
