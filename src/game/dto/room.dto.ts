export class RoomDto {
  id: string;
  creatorProfile: {
    id: string;
    name: string;
    avatar: string | null;
  };
  createdAt: string;
}

export class AvailableRoomsDto {
  rooms: RoomDto[];
}
