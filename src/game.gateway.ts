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
    handleCreate(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
        const res = this.gameService.createGame(roomId, client.id);
        if (res.error) {
            client.emit('error', res.error);
        } else {
            client.join(roomId);
            client.emit('created', { symbol: res.symbol });
        }
    }

    @SubscribeMessage('join_game')
    handleJoin(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
        const res = this.gameService.joinGame(roomId, client.id);
        if (res.error) {
            client.emit('error', res.error);
        } else {
            client.join(roomId);
            client.emit('joined', { symbol: res.symbol });
            // Сообщаем всем в комнате, что игра началась
            this.server.to(roomId).emit('game_start', { turn: 'X' });
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

    handleDisconnect(client: Socket) {
        this.gameService.removePlayer(client.id);
    }
}