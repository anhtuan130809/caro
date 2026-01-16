const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        board: Array(9).fill(null),
        currentPlayer: "X",
        gameOver: false,
      };
    }

    const room = rooms[roomId];
    const count = Object.keys(room.players).length;

    if (count >= 2) {
      socket.emit("roomFull");
      return;
    }

    const symbol = count === 0 ? "X" : "O";
    room.players[socket.id] = symbol;

    socket.emit("assign", symbol);
    socket.emit("init", room);
    io.to(roomId).emit("system", `${symbol} đã vào phòng`);
  });

  socket.on("move", ({ roomId, index }) => {
    const room = rooms[roomId];
    if (!room || room.gameOver) return;

    const symbol = room.players[socket.id];
    if (symbol !== room.currentPlayer) return;
    if (room.board[index]) return;

    room.board[index] = symbol;

    if (checkWin(room.board, symbol)) {
      room.gameOver = true;
      io.to(roomId).emit("update", { ...room, winner: symbol });
    } else {
      room.currentPlayer = symbol === "X" ? "O" : "X";
      io.to(roomId).emit("update", room);
    }
  });

  socket.on("reset", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    room.board = Array(9).fill(null);
    room.currentPlayer = "X";
    room.gameOver = false;

    io.to(roomId).emit("init", room);
  });

  socket.on("chat", ({ roomId, msg }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players[socket.id];
    io.to(roomId).emit("chat", { player, msg });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        room.board = Array(9).fill(null);
        room.currentPlayer = "X";
        room.gameOver = false;
        io.to(roomId).emit("system", "Đối thủ đã rời phòng, ván mới bắt đầu");
        io.to(roomId).emit("init", room);
      }
    }
  });
});

function checkWin(board, p) {
  const wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  return wins.some((c) => c.every((i) => board[i] === p));
}

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
