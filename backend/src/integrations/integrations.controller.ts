import { Controller, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReniecService } from './reniec.service';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly reniecService: ReniecService) {}

  @Get('dni/:dni')
  @ApiOperation({ summary: 'Verificar un DNI contra RENIEC (miapi.cloud) y devolver los datos' })
  async verifyDni(@Param('dni') dni: string) {
    if (!/^\d{8}$/.test(dni)) {
      throw new BadRequestException('El DNI debe tener exactamente 8 dígitos');
    }
    const result = await this.reniecService.verifyDni(dni);
    if (!result.success) {
      throw new BadRequestException('No se pudo verificar el DNI en RENIEC');
    }
    return result;
  }
}
