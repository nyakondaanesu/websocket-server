export function videoSock(socket, usersVideo, privateRoomsVideo) {
  socket.on("authenticateVideo", ({ googleUserId }) => {
    console.log(`🔐 Authenticating user: ${googleUserId}`);

    if (usersVideo[googleUserId]) {
      const oldSocketId = users[googleUserId];
      io.sockets.sockets.get(oldSocketId)?.disconnect();
      cleanupUserConnection(oldSocketId, googleUserId);
    }

    usersVideo[googleUserId] = socket.id;

    console.log(`✅ User authenticated: ${googleUserId}`);
  });

  //join or create a video chat room
  socket.on("joinVideoChatRoom", (googleUserId) => {
    let availableRoom = privateRoomsVideo.find(
      (room) => room.users.length === 1
    );
    if (availableRoom && availableRoom.addUser(socket.id)) {
      socket.join(availableRoom.id);
      //
      io.to(availableRoom.id).emit("VideoMatchFound");
    } else {
      const newRoom = new Room(generateUniqueId());
      newRoom.addUser(socket.id);
      privateRoomsVideo.push(newRoom);
      socket.join(newRoom.id);
      console.log(`🆕 ${googleUserId} created new private room: ${newRoom.id}`);
    }
  });

  socket.on("offer", (offer) => {
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      console.log(`💬 Message in room ${userRoom.id}: ${data.actualMessage}`);
      socket.to(userRoom.id).emit("offer", offer);
    }
  });

  socket.on("answer", (answer) => {
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      console.log(`💬 Message in room ${userRoom.id}: ${data.actualMessage}`);
      socket.to(userRoom.id).emit("answer", answer);
    }
  });

  socket.on("ice-candidate", (candidate) => {
    const userRoom = privateRoomsVideo.find((room) =>
      room.users.includes(socket.id)
    );
    if (userRoom) {
      console.log(`💬 Message in room ${userRoom.id}: ${data.actualMessage}`);
      socket.to(userRoom.id).emit("ice-candidate", candidate);
    }
  });
}
