export function videoSock(socket, usersVideo, privateRoomsVideo) {
  // Fix: Remove reference to undefined 'users' variable
  socket.on("authenticateVideo", ({ googleUserId }) => {
    if (usersVideo[googleUserId]) {
      const oldSocketId = usersVideo[googleUserId]; // Changed from users to usersVideo
      socket.to(oldSocketId).emit("disconnect");
    }
    usersVideo[googleUserId] = socket.id;
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
