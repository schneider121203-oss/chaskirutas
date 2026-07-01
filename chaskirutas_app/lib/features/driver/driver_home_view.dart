import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_provider.dart';
import '../../core/theme.dart';

class DriverHomeView extends ConsumerStatefulWidget {
  const DriverHomeView({super.key});

  @override
  ConsumerState<DriverHomeView> createState() => _DriverHomeViewState();
}

class _DriverHomeViewState extends ConsumerState<DriverHomeView> {
  bool _isOnline = false;
  
  // Real active trip variables
  bool _hasActiveTripRequest = false;
  double _passengerFare = 15.00;
  String _passengerRoute = 'San Isidro a Lince';
  
  String? _activeTripId;
  String _activeTripStatus = 'RESERVADO'; // RESERVADO, EN_CAMINO, EN_CURSO
  Timer? _pollingTimer;

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _toggleOnline() async {
    final client = ref.read(apiClientProvider);
    try {
      final res = await client.dio.post('/drivers/me/toggle-online');
      setState(() {
        _isOnline = !_isOnline;
        if (_isOnline) {
          _startPollingRequests();
        } else {
          _stopPollingRequests();
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res.data['message']),
            backgroundColor: ChaskiTheme.accent,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        String msg = 'Error de conexión';
        if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
          final raw = (e as dynamic).response.data['message'];
          msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _startPollingRequests() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (!mounted || !_isOnline) {
        timer.cancel();
        return;
      }
      
      // If driver is already in a trip, don't poll new ones
      if (_hasActiveTripRequest && _activeTripStatus != 'RESERVADO') {
        return;
      }

      final client = ref.read(apiClientProvider);
      try {
        final res = await client.dio.get('/trips/current-request');
        if (!mounted || !_isOnline) return;

        if (res.data != null) {
          final trip = res.data['trip'];
          final booking = res.data['booking'];
          
          if (trip != null && booking != null) {
            setState(() {
              _hasActiveTripRequest = true;
              _activeTripId = trip['id'];
              _activeTripStatus = trip['status'];
              _passengerFare = (booking['farePen'] as num).toDouble();
              
              final double startLat = (trip['startedLat'] as num).toDouble();
              final double startLng = (trip['startedLng'] as num).toDouble();
              final double endLat = (trip['endedLat'] as num).toDouble();
              final double endLng = (trip['endedLng'] as num).toDouble();
              _passengerRoute = 'De (${startLat.toStringAsFixed(4)}, ${startLng.toStringAsFixed(4)}) a (${endLat.toStringAsFixed(4)}, ${endLng.toStringAsFixed(4)})';
            });
          }
        } else {
          // No active request found on server
          setState(() {
            _hasActiveTripRequest = false;
            _activeTripId = null;
          });
        }
      } catch (_) {}
    });
  }

  void _stopPollingRequests() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    setState(() {
      _hasActiveTripRequest = false;
      _activeTripId = null;
    });
  }

  void _updateTripStatus(String newStatus) async {
    if (_activeTripId == null) return;

    final client = ref.read(apiClientProvider);
    try {
      await client.dio.patch('/trips/$_activeTripId/status', data: {
        'status': newStatus,
      });

      setState(() {
        _activeTripStatus = newStatus;
        if (newStatus == 'COMPLETADO') {
          _hasActiveTripRequest = false;
          _activeTripId = null;
          // Restart polling for next requests
          _startPollingRequests();
        }
      });

      if (mounted) {
        String msg = '';
        if (newStatus == 'EN_CAMINO') msg = '¡Viaje aceptado! En camino a recoger al pasajero.';
        if (newStatus == 'EN_CURSO') msg = '¡Viaje iniciado! Conduciendo hacia el destino.';
        if (newStatus == 'COMPLETADO') msg = '¡Viaje finalizado con éxito! Boleta de SUNAT generada.';
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: Colors.green),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al actualizar estado del viaje'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _uploadMockDocs() async {
    final client = ref.read(apiClientProvider);
    try {
      final randSuffix = (DateTime.now().millisecondsSinceEpoch % 1000).toString().padLeft(3, '0');
      
      // Simulate registering vehicle
      await client.dio.post('/drivers/me/vehicle', data: {
        'plate': 'XYZ-$randSuffix',
        'brand': 'Nissan',
        'model': 'Sentra',
        'year': 2020,
        'seatsTotal': 5,
      });

      // Simulate uploading DNI
      await client.dio.post('/drivers/me/documents', data: {
        'kind': 'DNI',
        'documentNumber': '7788$randSuffix',
        'fileUrl': 'https://s3.amazonaws.com/dni.jpg',
      });

      // Simulate uploading LICENCIA
      await client.dio.post('/drivers/me/documents', data: {
        'kind': 'LICENCIA',
        'documentNumber': 'L9988$randSuffix',
        'fileUrl': 'https://s3.amazonaws.com/licencia.jpg',
      });

      // Simular aprobación directa de admin en backend para activar al conductor en desarrollo
      final profile = ref.read(authProvider).userProfile;
      if (profile != null) {
        // Find document IDs to verify
        final docRes = await client.dio.get('/drivers/me/documents');
        final List docs = docRes.data;
        for (var doc in docs) {
          await client.dio.patch('/admin/documents/${doc['id']}/verify', data: {
            'isVerified': true,
          });
        }
      }

      await ref.read(authProvider.notifier).fetchProfile();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Documentos DNI + Licencia subidos y verificados por Admin. ¡Cuenta Activa!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        String msg = (e as dynamic).message ?? 'Error';
        if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
          final raw = (e as dynamic).response.data['message'];
          msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al subir: $msg'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(authProvider).userProfile;
    final driverData = profile?['driver'];

    final step = driverData != null ? driverData['formalizationStep'] ?? 1 : 1;
    final pct = driverData != null ? driverData['formalizationPct'] ?? 0 : 0;
    final status = driverData != null ? driverData['status'] ?? 'EN_REGISTRO' : 'EN_REGISTRO';

    final isFormalized = status == 'ACTIVO';

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  Text(
                    isFormalized ? '🟢 CONECTADO A LA RED SUTRAN/ATU' : '⚠️ FORMALIZACIÓN REQUERIDA',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isFormalized ? ChaskiTheme.accent : Colors.orange,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Estado: $status',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text('Progreso: $pct% (Paso $step de 6)'),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(value: pct / 100, color: ChaskiTheme.primary),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          if (!isFormalized) ...[
            const Text(
              'Pasos para formalizarse con la ATU:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                children: [
                  _buildStepTile(1, 'Validar DNI y Selfie Biométrica', step >= 1),
                  _buildStepTile(2, 'Subir Licencia de Conducir y Antecedentes', step >= 2),
                  _buildStepTile(3, 'Registrar Vehículo (SOAT y Tarjeta Propiedad)', step >= 3),
                  _buildStepTile(4, 'Firmar Contrato Digital de Afiliación', step >= 4),
                  _buildStepTile(5, 'Declaración Jurada y Pago de Derecho de Trámite', step >= 5),
                  _buildStepTile(6, 'TUC (Tarjeta Única de Concesión) Emitida', step >= 6),
                ],
              ),
            ),
            ElevatedButton.icon(
              onPressed: _uploadMockDocs,
              icon: const Icon(Icons.upload_file_rounded),
              label: const Text('Simular Carga & Aprobación de Documentos'),
            ),
          ] else ...[
            // Dashboard del Conductor Formalizado
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recibir solicitudes de viaje',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Switch(
                  value: _isOnline,
                  activeColor: ChaskiTheme.primary,
                  onChanged: (val) => _toggleOnline(),
                )
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: _isOnline
                  ? (_hasActiveTripRequest
                      ? Card(
                          child: Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.hail_rounded, color: ChaskiTheme.primary, size: 28),
                                    const SizedBox(width: 12),
                                    Text(
                                      _activeTripStatus == 'RESERVADO'
                                          ? 'Solicitud Recibida'
                                          : (_activeTripStatus == 'EN_CAMINO' ? 'Viaje Aceptado' : 'Viaje en Curso'),
                                      style: Theme.of(context).textTheme.titleLarge,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Text('Ruta: $_passengerRoute', style: const TextStyle(fontSize: 16)),
                                Text('Tarifa: S/ ${_passengerFare.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: ChaskiTheme.primary)),
                                const SizedBox(height: 24),
                                if (_activeTripStatus == 'RESERVADO') ...[
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: () => _updateTripStatus('EN_CAMINO'),
                                          child: const Text('Aceptar Viaje'),
                                        ),
                                      ),
                                    ],
                                  )
                                ] else if (_activeTripStatus == 'EN_CAMINO') ...[
                                  ElevatedButton.icon(
                                    onPressed: () => _updateTripStatus('EN_CURSO'),
                                    icon: const Icon(Icons.play_arrow_rounded),
                                    label: const Text('Iniciar Viaje (Pasajero abordo)'),
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, foregroundColor: Colors.black),
                                  )
                                ] else if (_activeTripStatus == 'EN_CURSO') ...[
                                  ElevatedButton.icon(
                                    onPressed: () => _updateTripStatus('COMPLETADO'),
                                    icon: const Icon(Icons.check_circle_rounded),
                                    label: const Text('Completar Viaje (Llegada a destino)'),
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                                  )
                                ]
                              ],
                            ),
                          ),
                        )
                      : const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              CircularProgressIndicator(color: ChaskiTheme.primary),
                              SizedBox(height: 16),
                              Text('Esperando solicitudes de pasajeros reales...', style: TextStyle(color: Colors.grey)),
                            ],
                          ),
                        ))
                  : const Center(
                      child: Text(
                        'Ponte Online para recibir solicitudes',
                        style: TextStyle(color: Colors.grey, fontSize: 16),
                      ),
                    ),
            ),
          ]
        ],
      ),
    );
  }

  Widget _buildStepTile(int number, String title, bool done) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: done ? ChaskiTheme.accent : Colors.grey[800],
        foregroundColor: Colors.white,
        child: Text('$number'),
      ),
      title: Text(title),
      trailing: done
          ? const Icon(Icons.check_circle_rounded, color: ChaskiTheme.accent)
          : const Icon(Icons.radio_button_unchecked_rounded, color: Colors.grey),
    );
  }
}
