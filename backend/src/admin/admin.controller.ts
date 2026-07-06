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
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Aprobar o rechazar un documento cargado (activa cuenta si TODOS los documentos están verificados)' })
  verifyDocument(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.verifyDocument(id, dto, user.sub);
  }

  @Patch('drivers/:id/approve-all')
  @Roles('ADMIN', 'OPERADOR')
  @ApiOperation({ summary: 'Aprobar TODOS los documentos del conductor y activar su cuenta' })
  approveAllDocuments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.approveAllDocuments(id, user.sub);
  }

  @Get('b2g/reports')
  @Roles('ADMIN', 'SUPERVISOR')
  @ApiOperation({ summary: 'Portal de auditoría gubernamental B2G (Vistas de cumplimiento y demanda)' })
  getB2gReports() {
    return this.adminService.getB2gReports();
  }
}
