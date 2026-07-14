import { Controller, Post, Patch, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { EstimateTripDto, RequestTripDto, UpdateTripStatusDto, StreamLocationDto, RateTripDto } from './dto';
import { CurrentUser } from '../common/decorators';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { TripStatus } from '../common/enums';

@ApiTags('Trips')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('routes')
  @ApiOperation({ summary: 'Obtener lista de rutas de taxi disponibles' })
  getTaxiRoutes() {
    return this.tripsService.getTaxiRoutes();
  }

  @Post('estimate')
  @ApiOperation({ summary: 'Calcular tarifa estimada del viaje' })
  estimate(@Body() dto: EstimateTripDto) {
    return this.tripsService.estimate(dto);
  }

  @Post('request')
  @ApiOperation({ summary: 'Pasajero propone precio y busca conductores' })
  requestTrip(@CurrentUser() user: any, @Body() dto: RequestTripDto) {
    return this.tripsService.requestTrip(user.sub, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de viajes del pasajero' })
  getHistory(@CurrentUser() user: any) {
    return this.tripsService.getHistory(user.sub);
  }

  @Get('current-request')
  @ApiOperation({ summary: 'Obtener solicitud de viaje activa asignada al conductor' })
  getCurrentRequest(@CurrentUser() user: any) {
    return this.tripsService.getCurrentRequest(user.sub);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Obtener la boleta electrónica generada por el viaje' })
  getTripInvoice(@Param('id') id: string) {
    return this.tripsService.getTripInvoice(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un viaje' })
  getTrip(@Param('id') id: string) {
    return this.tripsService.getTrip(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado del viaje (EN_CAMINO -> EN_CURSO -> COMPLETADO)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTripStatusDto) {
    return this.tripsService.updateStatus(id, dto.status as TripStatus);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Conductor acepta el viaje y se lo auto-asigna' })
  acceptTrip(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tripsService.acceptTrip(id, user.sub);
  }

  @Post(':id/location')
  @ApiOperation({ summary: 'Conductor transmite posición GPS del vehículo en streaming' })
  streamLocation(@Param('id') id: string, @Body() dto: StreamLocationDto) {
    return this.tripsService.streamLocation(id, dto);
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Calificación cruzada del viaje' })
  rateTrip(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: RateTripDto) {
    return this.tripsService.rateTrip(id, user.sub, dto);
  }
}
