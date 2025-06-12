require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Modelos
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  socketId: { type: String, default: '' },
  lastSeen: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  delivered: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de autenticación JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Rutas de API
app.post('/api/register', async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      phone,
      password: hashedPassword
    });
    
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: user._id, username, phone } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, username: user.username, phone } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/validate', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.sendStatus(404);
    res.json({ user });
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate({
      path: 'contacts',
      select: 'username phone lastSeen socketId'
    });
    
    const chats = await Promise.all(user.contacts.map(async (contact) => {
      const lastMessage = await Message.findOne({
        $or: [
          { sender: req.user.userId, receiver: contact._id },
          { sender: contact._id, receiver: req.user.userId }
        ]
      }).sort({ timestamp: -1 });
      
      return {
        contact,
        lastMessage
      };
    }));
    
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener chats' });
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.query;
    if (!contactId) return res.status(400).json({ error: 'Se requiere contactId' });

    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, receiver: contactId },
        { sender: contactId, receiver: req.user.userId }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// WebSocket Connection
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      const user = await User.findById(decoded.userId);
      
      if (user) {
        user.socketId = socket.id;
        user.lastSeen = new Date();
        await user.save();
        
        socket.join(user._id.toString());
        console.log(`Usuario autenticado: ${user.username} (${socket.id})`);
        
        user.contacts.forEach(contactId => {
          io.to(contactId.toString()).emit('contact-status', {
            userId: user._id,
            online: true
          });
        });
      }
    } catch (error) {
      socket.disconnect();
    }
  });

  socket.on('send-message', async ({ receiverId, content }) => {
    try {
      const sender = await User.findOne({ socketId: socket.id });
      if (!sender) return;
      
      const receiver = await User.findById(receiverId);
      if (!receiver) return;
      
      const message = new Message({
        sender: sender._id,
        receiver: receiver._id,
        content,
        delivered: Boolean(receiver.socketId)
      });
      
      await message.save();
      
      if (receiver.socketId) {
        io.to(receiver.socketId).emit('new-message', {
          senderId: sender._id,
          content,
          timestamp: message.timestamp,
          messageId: message._id
        });
      }
      
      socket.emit('message-sent', {
        receiverId,
        content,
        timestamp: message.timestamp,
        delivered: message.delivered,
        messageId: message._id
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  });

  socket.on('mark-as-read', async ({ messageId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { read: true });
    } catch (error) {
      console.error('Error al marcar como leído:', error);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const user = await User.findOne({ socketId: socket.id });
      if (user) {
        user.socketId = '';
        user.lastSeen = new Date();
        await user.save();
        
        user.contacts.forEach(contactId => {
          io.to(contactId.toString()).emit('contact-status', {
            userId: user._id,
            online: false
          });
        });
      }
      console.log('Cliente desconectado:', socket.id);
    } catch (error) {
      console.error('Error al manejar desconexión:', error);
    }
  });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
});