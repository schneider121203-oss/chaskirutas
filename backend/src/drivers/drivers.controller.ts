import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { UpdateDriverDto, CreateVehicleDto, UploadDocumentDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../common/guards';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  @Roles('CONDUCTOR')
  @ApiOperation({ summary: 'Obtener datos de conductor propio' })
  getDriver(@CurrentUser() user: any) {
    return this.driversService.getDriver(user.sub);
  }

  @Patch('me')
  @Roles('CONDUCTOR')
  @ApiOperation({ summary: 'Actualizar datos de conductor (banco, etc.)' })
  updateDriver(@CurrentUser() user: any, @Body() dto: UpdateDriverDto) {
    return this.driversService.updateDriver(user.sub, dto);
  }

  @Get('me/vehicle')
  @Roles('CONDUCTOR')
  @ApiOperation({ summary: 'Obtener vehículo del conductor' })
  getVehicle(@CurrentUser() user: any) {
    return this.driversService.getVehicle(user.sub);
  }

  @Post('me/vehicle')
  @Roles('CONDUCTOR')
  @ApiOperation({ summary: 'Registrar vehículo del conductor' })
  createVehicle(@CurrentUser() user: any, @Body() dto: CreateVehicleDto) {
    return this.driversService.createVehicle(user.sub, dto);
  }

  @Get('me/documents')
  @Roles('CONDUCTOR')
  @ApiOperation({ summary: 'Listar documentos del conductor' })
  getDocuments(@CurrentUser() user: any) {
    return this.driversService.getDocuments(user.sub);
  }

  @Post('me/documents')
  @Roles('CONDUCTOR')
  @ApiOperation({ summary: 'Subir documentos para formalización ATU' })
  uploadDocument(@CurrentUser() user: any, @Body() dto: UploadDocumentDto) {
    return this.driversService.uploadDocument(user.sub, dto);
  }

  @Post('me/toggle-online')
  @Roles('CONDUCTOR')
  @ApiOperation({ summary: 'Conectarse / Desconectarse (Solo conductores formalizados y activos)' })
  toggleOnline(@CurrentUser() user: any) {
    return this.driversService.toggleOnline(user.sub);
  }
}
