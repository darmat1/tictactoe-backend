import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { RoomService } from './game/room.service';
import { AvailableRoomsDto } from './game/dto/room.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly roomService: RoomService,
  ) {}

  private broadcastRoomsUpdate(): void {
    const rooms = this.roomService.getAvailableRooms();
    this.server.emit('rooms_updated', { rooms } as AvailableRoomsDto);
  }

  @SubscribeMessage('create_game')
  handleCreate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const res = this.gameService.createGame(
      data.roomId,
      client.id,
      data.profile,
    );
    if (res.error) {
      client.emit('error', res.error);
      this.broadcastRoomsUpdate();
    } else {
      client.join(data.roomId);

      this.roomService.addRoom(data.roomId, data.profile, client.id);
      this.broadcastRoomsUpdate();

      client.emit('created');
    }
  }

  @SubscribeMessage('join_game')
  handleJoin(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const res = this.gameService.joinGame(data.roomId, client.id, data.profile);

    if (res.error) {
      client.emit('error', res.error);
      this.broadcastRoomsUpdate();
      return;
    }

    if (res.success) {
      client.join(data.roomId);

      this.roomService.addPlayerToRoom(data.roomId, client.id);
      this.broadcastRoomsUpdate();

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
    const res = this.gameService.makeMove(
      data.roomId,
      client.id,
      data.index,
      data.symbol,
    );

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
  handleRematch(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const res = this.gameService.voteForRematch(roomId, client.id);

    if (res.error) return;

    if (res.restarted) {
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
  handleLeave(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.handleDisconnect(client);
  }

  @SubscribeMessage('get_rooms')
  handleGetRooms(): void {
    this.broadcastRoomsUpdate();
  }

  handleConnection(client: Socket) {
    this.broadcastRoomsUpdate();
  }

  handleDisconnect(client: Socket) {
    // Проверяем, является ли клиент создателем
    this.roomService.handleCreatorDisconnect(client.id);
    this.roomService.removePlayerFromRoom(client.id);
    this.broadcastRoomsUpdate();

    const res = this.gameService.leaveGame(client.id);
    if (res) {
      client.to(res.roomId).emit('opponent_left');
    }
  }
}
