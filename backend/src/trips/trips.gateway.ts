import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface OnlineDriver {
  socketId: string;
  lat: number;
  lng: number;
}

/**
 * Gateway de matching en tiempo real (namespace ws/matching).
 *
 * Flujo:
 *  1. Conductor se registra con su ubicación (driver:register).
 *  2. Pasajero emite solicitud (passenger:request-ride) → solo los conductores
 *     dentro de 5 km reciben driver:ride-request.
 *  3. Conductor envía oferta/contraoferta (driver:submit-offer) → el pasajero
 *     recibe passenger:offer-received.
 *  4. Pasajero acepta (passenger:accept-offer) → el conductor elegido recibe
 *     driver:offer-accepted y el resto driver:request-cancelled.
 *  5. Conductor transmite GPS (driver:location) → el pasajero recibe
 *     passenger:driver-location cada 5 s para pintarlo en el mapa.
 */
@WebSocketGateway({ cors: true, namespace: 'ws/matching' })
export class TripsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TripsGateway.name);
  private static readonly RADIUS_KM = 5;

  private readonly onlineDrivers = new Map<string, OnlineDriver>(); // driverId -> data
  private readonly tripPassengerSocket = new Map<string, string>(); // tripId -> passenger socketId

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    for (const [driverId, data] of this.onlineDrivers.entries()) {
      if (data.socketId === client.id) {
        this.onlineDrivers.delete(driverId);
        this.logger.log(`Conductor ${driverId} desconectado (limpieza)`);
        break;
      }
    }
    for (const [tripId, socketId] of this.tripPassengerSocket.entries()) {
      if (socketId === client.id) this.tripPassengerSocket.delete(tripId);
    }
  }

  // Haversine en km entre dos coordenadas.
  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  @SubscribeMessage('driver:register')
  handleRegisterDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string; lat?: number; lng?: number },
  ) {
    this.onlineDrivers.set(data.driverId, {
      socketId: client.id,
      lat: data.lat ?? 0,
      lng: data.lng ?? 0,
    });
    this.logger.log(`Conductor online: ${data.driverId} (${this.onlineDrivers.size} activos)`);
    return { status: 'registered', onlineDrivers: this.onlineDrivers.size };
  }

  @SubscribeMessage('driver:location-update')
  handleDriverLocationUpdate(
    @MessageBody() data: { driverId: string; lat: number; lng: number },
  ) {
    const d = this.onlineDrivers.get(data.driverId);
    if (d) {
      d.lat = data.lat;
      d.lng = data.lng;
    }
  }

  @SubscribeMessage('driver:offline')
  handleDriverOffline(@MessageBody() data: { driverId: string }) {
    this.onlineDrivers.delete(data.driverId);
  }

  @SubscribeMessage('passenger:request-ride')
  handleRequestRide(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      tripId: string;
      passengerId?: string;
      passengerName?: string;
      startLat: number;
      startLng: number;
      endLat?: number;
      endLng?: number;
      proposedFare: number;
    },
  ) {
    this.tripPassengerSocket.set(data.tripId, client.id);

    // Filtrar conductores dentro del radio de 5 km del punto de recojo.
    // Si un conductor no reportó ubicación (0,0), se incluye igual (fallback demo).
    let notified = 0;
    for (const d of this.onlineDrivers.values()) {
      const hasLocation = d.lat !== 0 || d.lng !== 0;
      const dist = hasLocation
        ? this.distanceKm(data.startLat, data.startLng, d.lat, d.lng)
        : 0;
      if (!hasLocation || dist <= TripsGateway.RADIUS_KM) {
        this.server.to(d.socketId).emit('driver:ride-request', {
          tripId: data.tripId,
          passengerName: data.passengerName ?? 'Pasajero',
          startLat: data.startLat,
          startLng: data.startLng,
          endLat: data.endLat,
          endLng: data.endLng,
          proposedFare: data.proposedFare,
          distanceToPickupKm: Number(dist.toFixed(2)),
        });
        notified++;
      }
    }
    this.logger.log(
      `Solicitud ${data.tripId} enviada a ${notified} conductores en ${TripsGateway.RADIUS_KM}km`,
    );
    return { status: 'broadcasted', driversNotified: notified };
  }

  @SubscribeMessage('driver:submit-offer')
  handleDriverOffer(
    @MessageBody()
    data: {
      tripId: string;
      driverId: string;
      driverName?: string;
      vehicle?: string;
      rating?: number;
      offerFare: number;
    },
  ) {
    const passengerSocket = this.tripPassengerSocket.get(data.tripId);
    if (!passengerSocket) return { status: 'passenger_offline' };

    this.server.to(passengerSocket).emit('passenger:offer-received', {
      tripId: data.tripId,
      driverId: data.driverId,
      driverName: data.driverName ?? 'Conductor',
      vehicle: data.vehicle,
      rating: data.rating,
      offerFare: data.offerFare,
    });
    return { status: 'sent' };
  }

  @SubscribeMessage('passenger:accept-offer')
  handleAcceptOffer(
    @MessageBody() data: { tripId: string; driverId: string; offerFare?: number },
  ) {
    const driver = this.onlineDrivers.get(data.driverId);
    if (driver) {
      this.server.to(driver.socketId).emit('driver:offer-accepted', {
        tripId: data.tripId,
        offerFare: data.offerFare,
      });
    }
    // Avisar al resto que la solicitud se cerró.
    for (const [driverId, d] of this.onlineDrivers.entries()) {
      if (driverId !== data.driverId) {
        this.server.to(d.socketId).emit('driver:request-cancelled', { tripId: data.tripId });
      }
    }
    return { status: 'accepted' };
  }

  @SubscribeMessage('driver:location')
  handleDriverLocationStream(
    @MessageBody()
    data: { tripId: string; lat: number; lng: number; heading?: number; speedKmh?: number },
  ) {
    const passengerSocket = this.tripPassengerSocket.get(data.tripId);
    if (passengerSocket) {
      this.server.to(passengerSocket).emit('passenger:driver-location', {
        tripId: data.tripId,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speedKmh: data.speedKmh,
      });
    }
  }

  @SubscribeMessage('trip:status')
  handleTripStatus(@MessageBody() data: { tripId: string; status: string }) {
    const passengerSocket = this.tripPassengerSocket.get(data.tripId);
    if (passengerSocket) {
      this.server.to(passengerSocket).emit('passenger:trip-status', data);
    }
  }
}
