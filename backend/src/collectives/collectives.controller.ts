import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CollectivesService } from './collectives.service';
import { CreateCollectiveDto, JoinCollectiveDto } from './dto';
import { CurrentUser } from '../common/decorators';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Collectives')
@Controller('collectives')
export class CollectivesController {
  constructor(private readonly collectivesService: CollectivesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar rutas de colectivo interprovincial disponibles' })
  getCollectives() {
    return this.collectivesService.getCollectives();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar nueva ruta de colectivo (valida prohibición en Lima/Callao)' })
  createCollective(@Body() dto: CreateCollectiveDto) {
    return this.collectivesService.createCollective(dto);
  }

  @Post(':routeId/join')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unirse a un colectivo: paso 1 verificación DNI y paso 2 depósito 30%' })
  joinCollective(
    @Param('routeId', ParseIntPipe) routeId: number,
    @CurrentUser() user: any,
    @Body() dto: JoinCollectiveDto,
  ) {
    return this.collectivesService.joinCollective(routeId, user.sub, dto);
  }
}
