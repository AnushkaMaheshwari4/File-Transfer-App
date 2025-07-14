const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(bodyParser.json());
// 📥 Signup API
app.post('/signup', (req, res) => {
  const { email, password } = req.body;
  const filePath = path.join(__dirname, 'users.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Error reading file' });

    const users = JSON.parse(data);
    const userExists = users.find(user => user.email === email);

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    users.push({ email, password });
    fs.writeFile(filePath, JSON.stringify(users, null, 2), err => {
      if (err) return res.status(500).json({ message: 'Error writing file' });
      res.status(200).json({ message: 'Signup successful' });
    });
  });
});

// 🔐 Login API
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const filePath = path.join(__dirname, 'users.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Error reading file' });

    const users = JSON.parse(data);
    const user = users.find(user => user.email === email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.status(200).json({ message: 'Login successful' });
  });
});

const http = require('http');
const { Server } = require('socket.io'); // ✅ Required!
const crypto = require('crypto'); // Optional: for encryption
const fs = require('fs');

// ✅ HTTP Server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('File Transfer WebSocket Server Running');
});

// ✅ Socket.io Setup with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = 5000;
const users = new Map();

// ✅ Main socket connection
io.on('connection', (socket) => {
  // existing listeners...

  socket.on('privateMessage', ({ toSocketId, message, from }) => {
    io.to(toSocketId).emit('receiveMessage', { message, from });
  });
  console.log(`User connected: ${socket.id}`);

  socket.on('login', (username) => {
    if (!username) return;

    users.set(socket.id, username);
    console.log(`User logged in: ${username}`);

    io.emit('userList', Array.from(users.entries()).map(([id, name]) => ({ id, name })));
  });

  socket.on('sendFile', ({ toSocketId, fileName, fileData, fileType }) => {
    if (!users.has(socket.id) || !users.has(toSocketId)) {
      return socket.emit('errorMessage', 'Invalid user');
    }

    io.to(toSocketId).emit('receiveFile', {
      from: users.get(socket.id),
      fileName,
      fileData,
      fileType
    });

    socket.emit('fileSent', { success: true });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    users.delete(socket.id);
    io.emit('userList', Array.from(users.entries()).map(([id, name]) => ({ id, name })));
  });
});

// ✅ Optional AES Encryption Support
function encrypt(data) {
  const key = crypto.createHash('sha256').update('secret').digest('base64').substr(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'base64'), cipher.final()]);
  return { encrypted: encrypted.toString('base64'), iv: iv.toString('base64') };
}

function decrypt(encryptedData, ivString) {
  const key = crypto.createHash('sha256').update('secret').digest('base64').substr(0, 32);
  const iv = Buffer.from(ivString, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'base64')),
    decipher.final()
  ]);
  return decrypted.toString();
}

server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
