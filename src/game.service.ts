import { Injectable } from '@nestjs/common';

interface GameState {
    players: string[]; // ID сокетов двух игроков
    board: (string | null)[]; // Массив из 9 клеток
    profiles: Map<string, PlayerProfile>;
    turn: 'X' | 'O'; // Чей сейчас ход
    rematchVotes: string[];
}

export interface PlayerProfile {
    name: string;
    avatar: string | null; // null если нет аватарки
}

@Injectable()
export class GameService {
    // Храним игры в памяти сервера (Map: RoomID -> GameState)
    private games = new Map<string, GameState>();

    createGame(roomId: string, playerId: string, profile: PlayerProfile) {
        if (this.games.has(roomId)) return { error: 'Комната занята!' };

        const profiles = new Map<string, PlayerProfile>();
        profiles.set(playerId, profile);

        this.games.set(roomId, {
            players: [playerId],
            profiles: profiles, // Сохраняем
            board: Array(9).fill(null),
            turn: 'X',
            rematchVotes: []
        });
        return { symbol: 'X' };
    }

    joinGame(roomId: string, playerId: string, profile: PlayerProfile) {
        const game = this.games.get(roomId);
        if (!game) return { error: 'Комната не найдена' };
        if (game.players.length >= 2) return { error: 'Комната полна' };

        game.players.push(playerId);
        game.profiles.set(playerId, profile); // Сохраняем второго

        // Находим профиль соперника, чтобы вернуть его тому, кто вошел
        const opponentId = game.players.find(id => id !== playerId);
        const opponentProfile = game.profiles.get(opponentId!);

        return { symbol: 'O', opponentProfile };
    }

    getOpponentProfile(roomId: string, myPlayerId: string) {
        const game = this.games.get(roomId);
        if (!game) return null;
        const opponentId = game.players.find(id => id !== myPlayerId);
        return opponentId ? game.profiles.get(opponentId) : null;
    }

    makeMove(roomId: string, playerId: string, index: number, symbol: 'X' | 'O') {
        const game = this.games.get(roomId);
        if (!game) return { error: 'Игра не найдена' };

        // ... проверки очереди хода и валидации (оставь как было) ...
        if (game.turn !== symbol) return { error: 'Сейчас не твой ход' };
        if (game.board[index] !== null) return { error: 'Клетка занята' };
        const playerIndex = symbol === 'X' ? 0 : 1;
        if (game.players[playerIndex] !== playerId) return { error: 'Ты не тот игрок!' };

        // Ход
        game.board[index] = symbol;
        game.turn = symbol === 'X' ? 'O' : 'X';

        // 2. Получаем результат проверки (теперь это объект)
        const winResult = this.checkWinner(game.board);

        // Если есть победитель ИЛИ ничья (нет победителя и нет пустых клеток)
        if (winResult || !game.board.includes(null)) {
            return {
                board: game.board,
                winner: winResult ? winResult.winner : 'Draw',
                winLine: winResult ? winResult.line : null // <--- ОТПРАВЛЯЕМ ЛИНИЮ
            };
        }

        return { board: game.board, turn: game.turn };
    }

    // Логика выхода игрока
    leaveGame(roomId: string, playerId: string) {
        const game = this.games.get(roomId);
        if (game) {
            // Удаляем комнату, так как игры 1 на 1
            this.games.delete(roomId);
            return { success: true, remainingPlayer: game.players.find(p => p !== playerId) };
        }
        return { success: false };
    }

    // Логика запроса реванша
    voteForRematch(roomId: string, playerId: string) {
        const game = this.games.get(roomId);
        if (!game) return { error: 'Игра не найдена' };

        // Если этот игрок еще не голосовал — добавляем
        if (!game.rematchVotes.includes(playerId)) {
            game.rematchVotes.push(playerId);
        }

        // Если проголосовали оба (2 голоса) — рестарт
        if (game.rematchVotes.length === 2) {
            game.board = Array(9).fill(null);
            game.turn = 'X';
            game.rematchVotes = []; // Сбрасываем голоса
            return { restarted: true, board: game.board, turn: game.turn };
        }

        return { restarted: false };
    }

    // Удаление игрока при разрыве соединения
    removePlayer(playerId: string) {
        for (const [roomId, game] of this.games.entries()) {
            if (game.players.includes(playerId)) {
                this.games.delete(roomId);
            }
        }
    }

    private checkWinner(board: (string | null)[]): { winner: string, line: number[] } | null {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Горизонтали
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Вертикали
            [0, 4, 8], [2, 4, 6]             // Диагонали
        ];
        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a]!, line: [a, b, c] }; // Возвращаем и кто, и где
            }
        }
        return null;
    }
}