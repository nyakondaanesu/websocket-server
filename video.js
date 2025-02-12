export function videoSock(
  socket,
  usersVideo,
  privateRoomsVideo,
  Room,
  generateUniqueId,
  io
) {
  socket.on("authenticateVideo", ({ googleUserId }) => {
    if (usersVideo[googleUserId]) {
      const oldSocketId = usersVideo[googleUserId];
      io.sockets.sockets.get(oldSocketId)?.disconnect();
    }
    usersVideo[googleUserId] = socket.id;
  });

  socket.on("joinVideoChatRoom", (googleUserId) => {
    console.log(`User ${googleUserId} looking for video match`);
    let availableRoom = privateRoomsVideo.find(
      (room) => room.users.length === 1
    );

    if (availableRoom && availableRoom.addUser(socket.id)) {
      socket.join(availableRoom.id);

      console.log(
        `✅ Match Found ${socket.id} joined room: ${availableRoom.id}`
      );
      io.to(availableRoom.id).emit("videoMatchFound");
    } else {
      const newRoom = new Room(generateUniqueId());
      newRoom.addUser(socket.id);
      privateRoomsVideo.push(newRoom);
      socket.join(newRoom.id);

      console.log(`🆕 ${socket.id} created new room: ${newRoom.id}`);
    }
  });

  socket.on("offer", (offer) => {
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      console.log(`📡 Forwarding offer to room ${userRoom.id}`);
      socket.to(userRoom.id).emit("offer", offer);
    }
  });

  socket.on("answer", (answer) => {
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      console.log(`📡 Forwarding answer to room ${userRoom.id}`);
      socket.to(userRoom.id).emit("answer", answer);
    }
  });

  socket.on("sendIceCandidate", (candidate) => {
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      socket.to(userRoom.id).emit("iceCandidate", candidate);
    }
  });

  socket.on("disconnect", () => {
    privateRoomsVideo = privateRoomsVideo.filter((room) => {
      if (room.users.includes(socket.id)) {
        room.users = room.users.filter((user) => user !== socket.id);
        io.to(room.id).emit("userDisconnected", {
          userId: socket.id,
          message: "User has disconnected",
        });
      }
      return room.users.length > 0;
    });

    Object.entries(usersVideo).forEach(([userId, sId]) => {
      if (sId === socket.id) delete usersVideo[userId];
    });
  });
}
