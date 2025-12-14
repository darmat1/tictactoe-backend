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

### Client -> Server (Actions)

| Event Name | Payload (JSON) | Description |
|:---|:---|:---|
| `create_game` | `{ roomId: string, profile: { name, avatar } }` | Creates a new lobby and stores the host's profile. |
| `join_game` | `{ roomId: string, profile: { name, avatar } }` | Joins an existing lobby and notifies the host. |
| `make_move` | `{ roomId: string, index: number, symbol: 'X' \| 'O' }` | Sends a move. Server validates turn and cell availability. |
| `request_rematch` | `roomId` (string) | Player votes for a rematch. Requires 2 votes to trigger restart. |
| `leave_game` | `roomId` (string) | Player explicitly leaves the room (clicks "Exit"). |

### Server -> Client (Updates)

| Event Name | Payload (JSON) | Description |
|:---|:---|:---|
| `created` | `{ symbol: 'X' }` | Sent to the host confirming room creation. |
| `joined` | `{ symbol: 'O', opponentProfile }` | Sent to the joiner. Contains host's profile data. |
| `opponent_joined` | `{ profile }` | Sent to the host. Contains joiner's profile data. |
| `game_start` | `{ turn: 'X' }` | Broadcasted when both players are ready. |
| `update_board` | `{ board: string[], turn: 'X' \| 'O' }` | Broadcasted after a valid move. |
| `game_over` | `{ winner: 'X' \| 'O' \| 'Draw', winLine: number[] }` | Sent when the game ends. Includes winning coordinates for UI line. |
| `opponent_wants_rematch`| `null` | Sent to the opponent if only one player clicked "Play Again". |
| `game_restarted` | `{ board, turn }` | Sent to both players when the rematch is confirmed. |
| `opponent_left` | `null` | Sent if the opponent leaves or disconnects. |
| `error` | `string` | Error message (e.g., "Room is full", "Not your turn"). |

## 🧩 Project Structure

- `src/game.gateway.ts` - WebSocket controller (Handles client events).
- `src/game.service.ts` - Core business logic (Game rules, state management).