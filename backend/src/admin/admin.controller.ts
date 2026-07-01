import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { VerifyDocumentDto } from './dto';
import { CurrentUser, Roles } from '../common/decorators';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { RolesGuard } from '../common/guards';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Obtener métricas y KPIs del Dashboard administrativo' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('drivers')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Listar todos los conductores' })
  getDrivers() {
    return this.adminService.getDrivers();
  }

  @Get('drivers/:id')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Obtener detalle de conductor + documentos + vehículo' })
  getDriverDetails(@Param('id') id: string) {
    return this.adminService.getDriverDetails(id);
  }

  @Patch('documents/:id/verify')
  @Roles('ADMIN', 'CONDUCTOR')
  @ApiOperation({ summary: 'Aprobar o rechazar un documento cargado (activa cuenta si DNI + Licencia están listos)' })
  verifyDocument(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.verifyDocument(id, dto, user.sub);
  }

  @Get('b2g/reports')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Portal de auditoría gubernamental B2G (Vistas de cumplimiento y demanda)' })
  getB2gReports() {
    return this.adminService.getB2gReports();
  }
}
