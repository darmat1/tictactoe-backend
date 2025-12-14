import { Injectable } from '@nestjs/common';

export interface PlayerProfile {
    name: string;
    avatar: string | null;
}

interface GameState {
    roomId: string;
    playerX: string;
    playerO?: string; // Опционально
    profiles: Map<string, PlayerProfile>;
    board: (string | null)[];
    turn: 'X' | 'O';
    rematchVotes: string[];
}

@Injectable()
export class GameService {
    // Убрали Partial, теперь карта строго типизирована
    private games = new Map<string, GameState>();

    createGame(roomId: string, playerId: string, profile: PlayerProfile) {
        if (this.games.has(roomId)) {
            return { error: 'Комната занята!' };
        }

        const profiles = new Map<string, PlayerProfile>();
        profiles.set(playerId, profile);

        this.games.set(roomId, {
            roomId,
            playerX: playerId,
            // playerO пока нет
            profiles: profiles,
            board: Array(9).fill(null),
            turn: 'X',
            rematchVotes: [],
        });

        return { success: true };
    }

    joinGame(roomId: string, playerId: string, profile: PlayerProfile) {
        const game = this.games.get(roomId);
        if (!game) return { error: 'Комната не найдена' };
        if (game.profiles.size >= 2) return { error: 'Комната полна' };

        // Сохраняем второго
        game.profiles.set(playerId, profile);
        const firstPlayerId = game.playerX;

        // Рандом
        let xId: string, oId: string;
        if (Math.random() > 0.5) {
            xId = firstPlayerId;
            oId = playerId;
        } else {
            xId = playerId;
            oId = firstPlayerId;
        }

        game.playerX = xId;
        game.playerO = oId;

        // Используем "!", так как мы только что положили туда данные
        return {
            success: true,
            xPlayerId: xId,
            oPlayerId: oId,
            xProfile: game.profiles.get(xId)!,
            oProfile: game.profiles.get(oId)!,
        };
    }

    makeMove(roomId: string, playerId: string, index: number, symbol: 'X' | 'O') {
        const game = this.games.get(roomId);
        if (!game) return { error: 'Игра не найдена' };

        if (game.turn !== symbol) return { error: 'Сейчас не твой ход' };
        if (game.board[index] !== null) return { error: 'Клетка занята' };

        if (symbol === 'X' && game.playerX !== playerId) return { error: 'Вы не играете за X!' };
        if (symbol === 'O' && game.playerO !== playerId) return { error: 'Вы не играете за O!' };

        game.board[index] = symbol;

        const winResult = this.checkWinner(game.board);

        if (winResult) {
            return {
                board: game.board,
                turn: null,
                winner: winResult.winner,
                winLine: winResult.line,
            };
        } else if (!game.board.includes(null)) {
            return { board: game.board, turn: null, winner: 'Draw' };
        }

        game.turn = symbol === 'X' ? 'O' : 'X';
        return { board: game.board, turn: game.turn };
    }

    voteForRematch(roomId: string, playerId: string) {
        const game = this.games.get(roomId);
        if (!game) return { error: 'Игра не найдена' };

        if (!game.rematchVotes.includes(playerId)) {
            game.rematchVotes.push(playerId);
        }

        if (game.rematchVotes.length === 2 && game.playerO) {
            const oldX = game.playerX;
            const oldO = game.playerO;

            // Смена сторон
            game.playerX = oldO;
            game.playerO = oldX;

            game.board = Array(9).fill(null);
            game.turn = 'X';
            game.rematchVotes = [];

            return {
                restarted: true,
                board: game.board,
                turn: 'X',
                newXId: game.playerX,
                newOId: game.playerO,
            };
        }
        return { restarted: false };
    }

    leaveGame(playerId: string) {
        for (const [id, game] of this.games.entries()) {
            if (game.playerX === playerId || game.playerO === playerId) {
                this.games.delete(id);
                return { roomId: id };
            }
        }
        return null;
    }

    private checkWinner(board: (string | null)[]) {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line: [a, b, c] };
            }
        }
        return null;
    }
}