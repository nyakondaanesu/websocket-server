export function videoSock(
  socket,
  usersVideo,
  privateRoomsVideo,
  Room,
  generateUniqueId,
  io
) {
  // Fix: Remove reference to undefined 'users' variable
  socket.on("authenticateVideo", ({ googleUserId }) => {
    if (usersVideo[googleUserId]) {
      const oldSocketId = usersVideo[googleUserId]; // Changed from users to usersVideo
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
      console.log(`Match found! Room: ${availableRoom.id}`);
      io.to(availableRoom.id).emit("vidoeMatchFound");
    } else {
      const newRoom = new Room(generateUniqueId());
      newRoom.addUser(socket.id);
      privateRoomsVideo.push(newRoom);
      socket.join(newRoom.id);
      console.log(`New video room created: ${newRoom.id}`);
    }
  });

  // Fix: Remove undefined 'data' reference in console logs
  socket.on("offer", (offer) => {
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      socket.to(userRoom.id).emit("offer", offer);
    }
  });

  socket.on("answer", (answer) => {
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      socket.to(userRoom.id).emit("answer", answer);
    }
  });

  // Fix: Same for answer and ice-candidate events
  socket.on("sendIceCandidate", (candidate) => {
    // Changed from ice-candidate to match client
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      socket.to(userRoom.id).emit("iceCandidate", candidate);
    }
  });
}
