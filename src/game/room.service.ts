import { Injectable } from '@nestjs/common';
import { RoomDto } from './dto/room.dto';

interface PlayerProfile {
  id: string;
  name: string;
  avatar: string | null;
}

@Injectable()
export class RoomService {
  private activeRooms = new Map<
    string,
    RoomDto & { players: string[]; creatorId: string }
  >();
  private disconnectedCreators = new Map<
    string,
    { timestamp: number; roomId: string }
  >();

  addRoom(roomId: string, profile: PlayerProfile, socketId: string): void {
    this.activeRooms.set(roomId, {
      id: roomId,
      creatorProfile: profile,
      createdAt: new Date().toISOString(),
      players: [socketId],
      creatorId: profile.id,
    });
  }

  removeRoom(roomId: string): void {
    this.activeRooms.delete(roomId);
  }

  addPlayerToRoom(roomId: string, socketId: string): void {
    const room = this.activeRooms.get(roomId);
    if (room) {
      room.players.push(socketId);
      // Если комната стала полной, удалить из списка доступных
      if (room.players.length >= 2) {
        this.activeRooms.delete(roomId);
      }
    }
  }

  removePlayerFromRoom(socketId: string): string[] {
    const emptyRooms: string[] = [];

    for (const [roomId, room] of this.activeRooms.entries()) {
      room.players = room.players.filter((id) => id !== socketId);

      if (room.players.length === 0) {
        emptyRooms.push(roomId);
      }
    }

    emptyRooms.forEach((roomId) => this.activeRooms.delete(roomId));
    return emptyRooms;
  }

  getAvailableRooms(): RoomDto[] {
    this.cleanupOldRooms();
    return Array.from(this.activeRooms.values())
      .filter((room) => room.players.length === 1)
      .map(({ players, creatorId, ...room }) => room);
  }

  cleanupOldRooms(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Очистка старых комнат
    for (const [roomId, room] of this.activeRooms.entries()) {
      if (new Date(room.createdAt).getTime() < oneHourAgo) {
        this.activeRooms.delete(roomId);
      }
    }

    // Очистка отключенных создателей
    for (const [creatorId, data] of this.disconnectedCreators.entries()) {
      if (Date.now() - data.timestamp > 30000) {
        // 30 секунд
        this.activeRooms.delete(data.roomId);
        this.disconnectedCreators.delete(creatorId);
      }
    }
  }

  handleCreatorDisconnect(socketId: string): string[] {
    const removedRooms: string[] = [];

    for (const [roomId, room] of this.activeRooms.entries()) {
      if (room.creatorId && room.players.includes(socketId)) {
        this.disconnectedCreators.set(room.creatorId, {
          timestamp: Date.now(),
          roomId,
        });

        // Удаляем сокет из игроков
        room.players = room.players.filter((id) => id !== socketId);

        if (room.players.length === 0) {
          removedRooms.push(roomId);
          this.activeRooms.delete(roomId);
          this.disconnectedCreators.delete(room.creatorId);
        }
      }
    }

    return removedRooms;
  }

  handleCreatorReconnect(creatorId: string): void {
    this.disconnectedCreators.delete(creatorId);
  }
}
