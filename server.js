const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors());

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB (make sure MongoDB is running locally)
mongoose.connect('mongodb://localhost:27017/collaborative-editor', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define a schema and model for the document
const documentSchema = new mongoose.Schema({
  _id: String,
  data: Object,
});

const Document = mongoose.model('Document', documentSchema);

const defaultValue = '';

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('get-document', async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit('load-document', document.data);

    socket.on('send-changes', (delta) => {
      socket.broadcast.to(documentId).emit('receive-changes', delta);
    });

    socket.on('save-document', async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

