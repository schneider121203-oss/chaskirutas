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

@WebSocketGateway({ cors: true, namespace: 'ws/matching' })
export class TripsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TripsGateway.name);
  private onlineDrivers = new Map<string, string>(); // driverId -> socketId

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    for (const [driverId, socketId] of this.onlineDrivers.entries()) {
      if (socketId === client.id) {
        this.onlineDrivers.delete(driverId);
        this.logger.log(`Conductor ${driverId} desconectado (limpieza)`);
        break;
      }
    }
  }

  @SubscribeMessage('driver:register')
  handleRegisterDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string },
  ) {
    this.onlineDrivers.set(data.driverId, client.id);
    this.logger.log(`Conductor registrado en WS: ${data.driverId} con socket ${client.id}`);
    return { status: 'registered' };
  }

  @SubscribeMessage('passenger:request-ride')
  handleRequestRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string; startLat: number; startLng: number; proposedFare: number },
  ) {
    this.logger.log(`Pasajero solicita viaje ${data.tripId} a tarifa S/ ${data.proposedFare}`);

    // Broadcast request to all registered online drivers (simulating 3km radius filtering)
    this.server.emit('driver:ride-request', {
      tripId: data.tripId,
      startLat: data.startLat,
      startLng: data.startLng,
      proposedFare: data.proposedFare,
      passengerSocketId: client.id,
    });
  }

  @SubscribeMessage('driver:submit-offer')
  handleDriverOffer(
    @MessageBody() data: { tripId: string; driverId: string; offerFare: number; passengerSocketId: string },
  ) {
    this.logger.log(`Conductor ${data.driverId} ofrece S/ ${data.offerFare} para viaje ${data.tripId}`);

    // Send direct message/event back to the passenger's socket
    this.server.to(data.passengerSocketId).emit('passenger:offer-received', {
      tripId: data.tripId,
      driverId: data.driverId,
      offerFare: data.offerFare,
    });
  }
}
