const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Notification = require("./models/Notification");
require("dotenv").config();

// Route Imports
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const messageRoutes = require("./routes/messageRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const groupRoutes = require("./routes/groupRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://massoudnet.vercel.app",
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "https://massoudnet.vercel.app/",
  "https://massoudnet.vercel.app/", // your Vercel frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/posts", postRoutes);

app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/notifications", notificationRoutes);

const searchRoutes = require("./routes/searchRoutes");
app.use("/api/search", searchRoutes);

const supportRoutes = require("./routes/supportRoutes");
app.use("/api/support", supportRoutes);

const storyRoutes = require("./routes/storyRoutes");
app.use("/api/stories", storyRoutes);

app.use("/api/groups", groupRoutes);

const feedRoutes = require("./routes/feedRoutes");
app.use("/api/feed", feedRoutes);

// MongoDB Connect & Start Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB error:", err));

// ====================================
// ✅ Socket.io Real-Time Setup
// ====================================
let onlineUsers = new Map();
global._io = io;
global.connectedUsers = new Map(); // ✅ REQUIRED!

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("getUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("sendMessage", (fullMessage) => {
    // Expecting fullMessage to contain at least:
    //   { _id, sender, text, media, conversationId, createdAt, receiverId, … }
    const { receiverId } = fullMessage;
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      // Forward the entire saved message object
      io.to(receiverSocket).emit("getMessage", fullMessage);
    }
  });

  socket.on("typing", ({ receiverId, conversationId }) => {
    const toSocket = onlineUsers.get(receiverId);
    if (toSocket) {
      io.to(toSocket).emit("typing", { conversationId });
    }
  });

  socket.on("stopTyping", ({ receiverId, conversationId }) => {
    const toSocket = onlineUsers.get(receiverId);
    if (toSocket) {
      io.to(toSocket).emit("stopTyping", { conversationId });
    }
  });

  socket.on(
    "sendNotification",
    async ({ senderId, receiverId, type, postId }) => {
      try {
        // ❌ Don't send notification to self
        if (senderId === receiverId) return;

        const newNotification = new Notification({
          senderId,
          receiverId,
          type,
          postId: postId || null,
        });
        await newNotification.save();

        const populatedNotification = await Notification.findById(
          newNotification._id
        ).populate("senderId", "name profilePic");

        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit(
            "getNotification",
            populatedNotification
          );
          console.log(`📨 Notification sent to ${receiverId}`);
        } else {
          console.log(`⚠️ Receiver ${receiverId} is offline`);
        }
      } catch (err) {
        console.error("❌ Notification error:", err.message);
      }
    }
  );

  socket.on("disconnect", () => {
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("getUsers", Array.from(onlineUsers.keys()));
    console.log("❌ Client disconnected:", socket.id);
  });
});
