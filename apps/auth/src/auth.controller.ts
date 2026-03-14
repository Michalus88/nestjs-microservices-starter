import { Controller, Post, Res, UseFilters, UseGuards } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { Response } from 'express';
import { CurrentUser, GrpcExceptionFilter, UserDocument } from '@app/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @CurrentUser() user: UserDocument,
    @Res({ passthrough: true }) response: Response,
  ) {
    const jwt = await this.authService.login(user, response);
    response.send(jwt);
  }

  @UseFilters(new GrpcExceptionFilter())
  @UseGuards(JwtAuthGuard)
  @GrpcMethod('AuthService', 'Authenticate')
  async authenticate(@Payload() data: any) {
    return data.user;
  }
}
