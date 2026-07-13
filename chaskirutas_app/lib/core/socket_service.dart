import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_client.dart';

/// Servicio de WebSocket (socket.io) para el matching en tiempo real.
///
/// Namespace del backend: `/ws/matching`. Conecta contra el mismo host de la API
/// (quitando el sufijo `/api`). Provee helpers finos sobre socket_io_client.
class SocketService {
  io.Socket? _socket;

  bool get isConnected => _socket?.connected ?? false;

  /// URL base del socket derivada de la URL de la API (sin `/api`).
  static String get _socketBase {
    var base = ApiClient.defaultBaseUrl; // ej: http://10.0.2.2:3000/api
    if (base.endsWith('/api')) base = base.substring(0, base.length - 4);
    return base;
  }

  void connect() {
    if (_socket != null) {
      if (!_socket!.connected) _socket!.connect();
      return;
    }
    _socket = io.io(
      '$_socketBase/ws/matching',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableReconnection()
          .disableAutoConnect()
          // Evita la página de advertencia interstitial de Ngrok (plan gratuito)
          // en el handshake del WebSocket.
          .setExtraHeaders({'ngrok-skip-browser-warning': 'true'})
          .build(),
    );
    _socket!.connect();
  }

  void emit(String event, [dynamic data]) {
    _socket?.emit(event, data);
  }

  /// Emite y espera el ack del servidor (callback).
  void emitWithAck(String event, dynamic data, void Function(dynamic) ack) {
    _socket?.emitWithAck(event, data, ack: ack);
  }

  void on(String event, void Function(dynamic) handler) {
    _socket?.on(event, handler);
  }

  void off(String event) {
    _socket?.off(event);
  }

  void disconnect() {
    _socket?.disconnect();
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}

/// Provider singleton del socket compartido por pasajero y conductor.
final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  ref.onDispose(service.dispose);
  return service;
});
