import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {

  @Get()
  getHello(): string {
    return 'Tic-Tac-Toe Game Server is Running! 🚀';
  }

  @Get('health')
  checkHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}
