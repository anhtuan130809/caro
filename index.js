const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.static("public"));

let players = {};
let board = Array(9).fill(null);
let currentPlayer = "X";
let gameOver = false;

io.on("connection", (socket) => {
  const playerCount = Object.keys(players).length;

  // Chặn người thứ 3
  if (playerCount >= 2) {
    socket.emit("full");
    socket.disconnect();
    return;
  }

  // Gán X / O
  const symbol = playerCount === 0 ? "X" : "O";
  players[socket.id] = symbol;

  socket.emit("assign", symbol);
  socket.emit("init", { board, currentPlayer, gameOver });

  // Đánh cờ
  socket.on("move", (index) => {
    if (gameOver) return;
    if (board[index]) return;
    if (players[socket.id] !== currentPlayer) return;

    board[index] = currentPlayer;

    if (checkWin(currentPlayer)) {
      gameOver = true;
      io.emit("update", {
        board,
        currentPlayer,
        gameOver,
        winner: currentPlayer,
      });
    } else {
      currentPlayer = currentPlayer === "X" ? "O" : "X";
      io.emit("update", { board, currentPlayer, gameOver });
    }
  });

  // Reset game
  socket.on("reset", () => {
    board = Array(9).fill(null);
    currentPlayer = "X";
    gameOver = false;
    io.emit("reset", { board, currentPlayer, gameOver });
  });

  // Chat
  socket.on("chat", (msg) => {
    const player = players[socket.id] || "Unknown";
    io.emit("chat", { player, msg });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    board = Array(9).fill(null);
    currentPlayer = "X";
    gameOver = false;
    io.emit("reset", { board, currentPlayer, gameOver });
  });
});

function checkWin(p) {
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
  return wins.some((combo) => combo.every((i) => board[i] === p));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
