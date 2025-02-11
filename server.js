import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const port = process.env.PORT || 5000;
const dev = process.env.NODE_ENV !== "production";
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: dev
      ? "http://localhost:5000"
      : "https://nextjs-chatapp-zeta.vercel.app/", // Allow all origins, change to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

// Room Management
class Room {
  constructor(RoomId) {
    this.id = RoomId;
    this.users = [];
  }

  addUser(userId) {
    if (this.users.length < 2) {
      this.users.push(userId);
      return true;
    }
    return false;
  }

  removeUser(userId) {
    this.users = this.users.filter((user) => user !== userId);
  }

  isEmpty() {
    return this.users.length === 0;
  }
}

// Utility function to generate unique room IDs
const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
};

// Store active rooms and users
let privateRooms = [];
let users = {}; // Maps Google User ID to Socket ID
let profilePics = {};

// WebSocket Connection Handling
io.on("connection", (socket) => {
  console.log(`🔗 New client connected: ${socket.id}`);

  socket.on("authenticate", ({ googleUserId, googleProfilePic }) => {
    console.log(`🔐 Authenticating user: ${googleUserId}`);

    if (users[googleUserId]) {
      const oldSocketId = users[googleUserId];
      io.sockets.sockets.get(oldSocketId)?.disconnect();
      cleanupUserConnection(oldSocketId, googleUserId);
    }

    users[googleUserId] = socket.id;
    profilePics[socket.id] = googleProfilePic;
    console.log(`✅ User authenticated: ${googleUserId}`);
  });

  socket.on("offer", (offer) => {
    console.log("📨 Offer received:", offer);
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    console.log("📨 Answer received:", answer);
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    console.log("❄️ ICE Candidate received:", candidate);
    socket.broadcast.emit("ice-candidate", candidate);
  });

  socket.on("joinPrivateChat", (googleUserId) => {
    let availableRoom = privateRooms.find((room) => room.users.length === 1);

    if (availableRoom && availableRoom.addUser(socket.id)) {
      socket.join(availableRoom.id);
      io.to(availableRoom.id).emit("matchFound", {
        thisUser: {
          id: availableRoom.users[0],
          username: Object.entries(users).find(
            ([key, value]) => value === availableRoom.users[0]
          )?.[0],
          image: profilePics[availableRoom.users[0]],
        },
        otherUser: {
          id: availableRoom.users[1],
          username: Object.entries(users).find(
            ([key, value]) => value === availableRoom.users[1]
          )?.[0],
          image: profilePics[availableRoom.users[1]],
        },
      });

      console.log(
        `👥 ${googleUserId} joined existing private room: ${availableRoom.id}`
      );
    } else {
      const newRoom = new Room(generateUniqueId());
      newRoom.addUser(socket.id);
      privateRooms.push(newRoom);
      socket.join(newRoom.id);
      console.log(`🆕 ${googleUserId} created new private room: ${newRoom.id}`);
    }
  });

  socket.on("sendPrivateMessage", (data) => {
    const userRoom = privateRooms.find((room) =>
      room.users.includes(socket.id)
    );

    if (userRoom) {
      console.log(`💬 Message in room ${userRoom.id}: ${data.actualMessage}`);
      socket.to(userRoom.id).emit("receivePrivateMessage", data);
    }
  });

  socket.on("disconnect", () => {
    const googleUserId = Object.entries(users).find(
      ([_, sId]) => sId === socket.id
    )?.[0];
    cleanupUserConnection(socket.id, googleUserId);
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Helper function to clean up user connections
const cleanupUserConnection = (socketId, googleUserId) => {
  privateRooms = privateRooms.filter((room) => {
    if (room.users.includes(socketId)) {
      io.to(room.id).emit("userDisconnected", {
        userId: googleUserId,
        message: "User has disconnected",
      });
      room.removeUser(socketId);
    }
    return !room.isEmpty();
  });

  delete profilePics[socketId];
  Object.entries(users).forEach(([userId, sId]) => {
    if (sId === socketId) delete users[userId];
  });
};

// Start Server
httpServer.listen(port, () => {
  console.log(`🚀 WebSocket server running on port ${port}`);
});
