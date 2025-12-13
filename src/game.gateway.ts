import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

interface CreateGameDto { roomId: string; profile: { name: string; avatar: string | null } }

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',')
            : '*',
        credentials: true,
    },
})

export class GameGateway implements OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(private readonly gameService: GameService) { }

    @SubscribeMessage('create_game')
    handleCreate(@MessageBody() data: CreateGameDto, @ConnectedSocket() client: Socket) {
        const res = this.gameService.createGame(data.roomId, client.id, data.profile);
        if (res.error) {
            client.emit('error', res.error);
        } else {
            client.join(data.roomId);
            client.emit('created', { symbol: res.symbol });
        }
    }

    @SubscribeMessage('join_game')
    handleJoin(@MessageBody() data: CreateGameDto, @ConnectedSocket() client: Socket) {
        const res = this.gameService.joinGame(data.roomId, client.id, data.profile);
        if (res.error) {
            client.emit('error', res.error);
        } else {
            client.join(data.roomId);

            // 1. Отправляем вошедшему его символ И профиль соперника (который уже был в комнате)
            client.emit('joined', {
                symbol: res.symbol,
                opponentProfile: res.opponentProfile
            });

            // 2. Отправляем создателю (первому игроку), что соперник зашел + его профиль
            client.to(data.roomId).emit('opponent_joined', {
                profile: data.profile
            });

            this.server.to(data.roomId).emit('game_start', { turn: 'X' });
        }
    }

    @SubscribeMessage('make_move')
    handleMove(
        @MessageBody() data: { roomId: string; index: number; symbol: 'X' | 'O' },
        @ConnectedSocket() client: Socket,
    ) {
        const res = this.gameService.makeMove(data.roomId, client.id, data.index, data.symbol);

        if (res.error) {
            client.emit('error', res.error);
            return;
        }

        // Отправляем всем обновление доски
        this.server.to(data.roomId).emit('update_board', {
            board: res.board,
            turn: res.turn,
        });

        if (res.winner) {
            this.server.to(data.roomId).emit('game_over', { winner: res.winner, winLine: res.winLine });
        }
    }

    @SubscribeMessage('leave_game')
    handleLeave(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
        // 1. Сначала сообщаем сопернику, что мы уходим (используем client.to)
        client.to(roomId).emit('opponent_left');

        // 2. Убираем себя из комнаты сокетов
        client.leave(roomId);

        // 3. Удаляем игру из памяти сервиса
        this.gameService.leaveGame(roomId, client.id);
    }

    @SubscribeMessage('request_rematch')
    handleRematch(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
        const res = this.gameService.voteForRematch(roomId, client.id);

        if (res.error) return;

        if (res.restarted) {
            // Если оба согласны — сообщаем ВСЕМ (server.to)
            this.server.to(roomId).emit('game_restarted', {
                board: res.board,
                turn: res.turn
            });
        } else {
            // Если только один нажал — сообщаем ТОЛЬКО СОПЕРНИКУ (client.to)
            client.to(roomId).emit('opponent_wants_rematch');
        }
    }

    handleDisconnect(client: Socket) {
        this.gameService.removePlayer(client.id);
    }
}