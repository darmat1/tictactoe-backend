export const MESSAGES = {
  // Game errors
  ROOM_OCCUPIED: 'ROOM_OCCUPIED',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  CELL_OCCUPIED: 'CELL_OCCUPIED',
  NOT_PLAYING_AS_X: 'NOT_PLAYING_AS_X',
  NOT_PLAYING_AS_O: 'NOT_PLAYING_AS_O',
} as const;

export const ERROR_MESSAGES = {
  [MESSAGES.ROOM_OCCUPIED]: 'Комната занята!',
  [MESSAGES.ROOM_NOT_FOUND]: 'Комната не найдена',
  [MESSAGES.ROOM_FULL]: 'Комната полна',
  [MESSAGES.GAME_NOT_FOUND]: 'Игра не найдена',
  [MESSAGES.NOT_YOUR_TURN]: 'Сейчас не твой ход',
  [MESSAGES.CELL_OCCUPIED]: 'Клетка занята',
  [MESSAGES.NOT_PLAYING_AS_X]: 'Вы не играете за X!',
  [MESSAGES.NOT_PLAYING_AS_O]: 'Вы не играете за O!',
} as const;
