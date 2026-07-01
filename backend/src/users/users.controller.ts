import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdatePassengerDto, CreateContactDto } from './dto';
import { CurrentUser } from '../common/decorators';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar perfil de usuario base' })
  updateUser(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(user.sub, dto);
  }

  @Patch('me/passenger')
  @ApiOperation({ summary: 'Actualizar perfil de pasajero' })
  updatePassenger(@CurrentUser() user: any, @Body() dto: UpdatePassengerDto) {
    return this.usersService.updatePassenger(user.sub, dto);
  }

  @Get('me/contacts')
  @ApiOperation({ summary: 'Obtener contactos de confianza para SOS' })
  getContacts(@CurrentUser() user: any) {
    return this.usersService.getContacts(user.sub);
  }

  @Post('me/contacts')
  @ApiOperation({ summary: 'Agregar un contacto de confianza' })
  addContact(@CurrentUser() user: any, @Body() dto: CreateContactDto) {
    return this.usersService.addContact(user.sub, dto);
  }

  @Delete('me/contacts/:id')
  @ApiOperation({ summary: 'Eliminar un contacto de confianza' })
  deleteContact(@CurrentUser() user: any, @Param('id') contactId: string) {
    return this.usersService.deleteContact(user.sub, contactId);
  }
}
