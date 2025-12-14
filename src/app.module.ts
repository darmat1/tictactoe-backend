import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { AppController } from './app.controller';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [GameGateway, GameService],
})
export class AppModule { }
