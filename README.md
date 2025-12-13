# 🎮 Tic-Tac-Toe Server (NestJS)

Real-time Multiplayer Game Backend built for **Telegram Mini Apps**.
Powered by **NestJS** and **Socket.io**.

## 🚀 Features

- **Real-time Communication**: Low-latency gameplay using WebSockets.
- **Clean Architecture**: Separation of concerns using NestJS Modules, Gateways, and Services.
- **Game Logic**: Server-side validation of moves, turn management, and win detection.
- **Scalable**: Built with standard NestJS patterns (Dependency Injection).

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: TypeScript
- **Transport**: Socket.io (WebSockets)
- **Deployment**: Ready for Railway/Render

## ⚙️ Installation & Running

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd tictactoe-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in Development mode**
   ```bash
   npm run start:dev
   ```
   *Server will start on port 3000 (default).*

## 🔌 WebSocket Events

| Event Name    | Direction | Payload | Description |
|:-------------|:---------:|:--------|:------------|
| `create_game`| Client -> Server | `roomId` (string) | Creates a new game lobby. |
| `join_game`  | Client -> Server | `roomId` (string) | Joins an existing lobby. |
| `make_move`  | Client -> Server | `{ roomId, index, symbol }` | Validates and processes a player's move. |
| `update_board`| Server -> Client | `{ board, turn }` | Broadcasts new board state to players. |
| `game_over`  | Server -> Client | `{ winner, winLine }` | Announces winner and winning coordinates. |

## 🧩 Project Structure

- `src/game.gateway.ts` - WebSocket controller (Handles client events).
- `src/game.service.ts` - Core business logic (Game rules, state management).