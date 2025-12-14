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

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(private readonly gameService: GameService) { }

    @SubscribeMessage('create_game')
    handleCreate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        const res = this.gameService.createGame(data.roomId, client.id, data.profile);
        if (res.error) {
            client.emit('error', res.error);
        } else {
            client.join(data.roomId);
            client.emit('created');
        }
    }

    @SubscribeMessage('join_game')
    handleJoin(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        const res = this.gameService.joinGame(data.roomId, client.id, data.profile);

        if (res.error) {
            client.emit('error', res.error);
            return;
        }

        if (res.success) {
            client.join(data.roomId);
            // Если success, то ID точно есть, используем "!"
            this.server.to(res.xPlayerId!).emit('game_start', {
                symbol: 'X',
                opponentProfile: res.oProfile,
                turn: 'X',
            });

            this.server.to(res.oPlayerId!).emit('game_start', {
                symbol: 'O',
                opponentProfile: res.xProfile,
                turn: 'X',
            });
        }
    }

    @SubscribeMessage('make_move')
    handleMove(
        @MessageBody() data: { roomId: string; index: number; symbol: 'X' | 'O' },
        @ConnectedSocket() client: Socket,
    ) {
        const res = this.gameService.makeMove(data.roomId, client.id, data.index, data.symbol);

        if (res.error) {
            return;
        }

        this.server.to(data.roomId).emit('update_board', {
            board: res.board,
            turn: res.turn,
        });

        if (res.winner) {
            this.server.to(data.roomId).emit('game_over', {
                winner: res.winner,
                winLine: res.winLine,
            });
        }
    }

    @SubscribeMessage('request_rematch')
    handleRematch(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
        const res = this.gameService.voteForRematch(roomId, client.id);

        if (res.error) return;

        if (res.restarted) {
            // ВОТ ЗДЕСЬ БЫЛА ОШИБКА. 
            // Добавляем "!", так как мы знаем, что если restarted=true, то newXId существует.
            this.server.to(res.newXId!).emit('game_restarted', {
                board: res.board,
                turn: 'X',
                newSymbol: 'X',
            });

            this.server.to(res.newOId!).emit('game_restarted', {
                board: res.board,
                turn: 'X',
                newSymbol: 'O',
            });
        } else {
            client.to(roomId).emit('opponent_wants_rematch');
        }
    }

    @SubscribeMessage('leave_game')
    handleLeave(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
        this.handleDisconnect(client);
    }

    handleDisconnect(client: Socket) {
        const res = this.gameService.leaveGame(client.id);
        if (res) {
            client.to(res.roomId).emit('opponent_left');
        }
    }
}