import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
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
  Timer? _locationStreamTimer;

  // Form controllers
  final _dniInputController = TextEditingController();
  final _licenseInputController = TextEditingController();
  final _licenseClassInputController = TextEditingController();
  final _licenseExpiresInputController = TextEditingController();
  
  final _vehiclePlateController = TextEditingController();
  final _vehicleBrandController = TextEditingController();
  final _vehicleModelController = TextEditingController();
  final _vehicleYearController = TextEditingController();
  final _vehicleSeatsController = TextEditingController(text: '5');

  bool _isActionLoading = false;

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _locationStreamTimer?.cancel();
    _dniInputController.dispose();
    _licenseInputController.dispose();
    _licenseClassInputController.dispose();
    _licenseExpiresInputController.dispose();
    _vehiclePlateController.dispose();
    _vehicleBrandController.dispose();
    _vehicleModelController.dispose();
    _vehicleYearController.dispose();
    _vehicleSeatsController.dispose();
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
              _passengerFare = double.parse(booking['farePen'].toString());
              
              final double startLat = double.parse(trip['startedLat'].toString());
              final double startLng = double.parse(trip['startedLng'].toString());
              final double endLat = double.parse(trip['endedLat'].toString());
              final double endLng = double.parse(trip['endedLng'].toString());
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
    _locationStreamTimer?.cancel();
    _locationStreamTimer = null;
    setState(() {
      _hasActiveTripRequest = false;
      _activeTripId = null;
    });
  }

  void _startLocationStreaming() {
    _locationStreamTimer?.cancel();
    _locationStreamTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (!mounted || _activeTripId == null || (_activeTripStatus != 'EN_CAMINO' && _activeTripStatus != 'EN_CURSO')) {
        timer.cancel();
        return;
      }
      try {
        final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
        final client = ref.read(apiClientProvider);
        await client.dio.post('/trips/$_activeTripId/location', data: {
          'lat': pos.latitude,
          'lng': pos.longitude,
        });
      } catch (e) {
        // Ignore location errors during stream to prevent spamming the driver
      }
    });
  }

  void _updateTripStatus(String newStatus) async {
    if (_activeTripId == null) return;

    final client = ref.read(apiClientProvider);
    try {
      if (newStatus == 'EN_CAMINO') {
        await client.dio.post('/trips/$_activeTripId/accept');
      } else {
        await client.dio.patch('/trips/$_activeTripId/status', data: {
          'status': newStatus,
        });
      }

      setState(() {
        _activeTripStatus = newStatus;
        if (newStatus == 'EN_CAMINO' || newStatus == 'EN_CURSO') {
          _startLocationStreaming();
        }
        if (newStatus == 'COMPLETADO') {
          _hasActiveTripRequest = false;
          _activeTripId = null;
          _locationStreamTimer?.cancel();
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

  Future<void> _uploadDni(String dni) async {
    if (dni.length != 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('DNI debe tener 8 dígitos'), backgroundColor: Colors.red),
      );
      return;
    }
    
    setState(() => _isActionLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      await client.dio.post('/drivers/me/documents', data: {
        'kind': 'DNI',
        'documentNumber': dni,
        'fileUrl': 'https://chaskirutas-s3.s3.amazonaws.com/dni_$dni.jpg',
      });
      await ref.read(authProvider.notifier).fetchProfile();
      setState(() => _isActionLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Paso 1: DNI subido con éxito.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      setState(() => _isActionLoading = false);
      _showErrorSnackBar(e);
    }
  }

  Future<void> _uploadLicencia(String lic, String cat, String exp) async {
    if (lic.isEmpty || cat.isEmpty || exp.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor completa todos los campos de la licencia'), backgroundColor: Colors.red),
      );
      return;
    }
    
    setState(() => _isActionLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      await client.dio.post('/drivers/me/documents', data: {
        'kind': 'LICENCIA',
        'documentNumber': lic,
        'expiresAt': exp,
        'fileUrl': 'https://chaskirutas-s3.s3.amazonaws.com/licencia_$lic.jpg',
      });
      await ref.read(authProvider.notifier).fetchProfile();
      setState(() => _isActionLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Paso 2: Licencia de conducir subida con éxito.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      setState(() => _isActionLoading = false);
      _showErrorSnackBar(e);
    }
  }

  Future<void> _registerVehicleAndSoat(String plate, String brand, String model, String yearStr, String seatsStr) async {
    final year = int.tryParse(yearStr);
    final seats = int.tryParse(seatsStr);
    if (plate.isEmpty || brand.isEmpty || model.isEmpty || year == null || seats == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor completa todos los campos del vehículo'), backgroundColor: Colors.red),
      );
      return;
    }
    
    setState(() => _isActionLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      // 1. Register vehicle
      await client.dio.post('/drivers/me/vehicle', data: {
        'plate': plate,
        'brand': brand,
        'model': model,
        'year': year,
        'seatsTotal': seats,
      });

      // 2. Upload SOAT doc
      await client.dio.post('/drivers/me/documents', data: {
        'kind': 'SOAT',
        'documentNumber': 'SOAT-$plate',
        'fileUrl': 'https://chaskirutas-s3.s3.amazonaws.com/soat_$plate.jpg',
      });

      await ref.read(authProvider.notifier).fetchProfile();
      setState(() => _isActionLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Paso 3: Vehículo y SOAT registrados con éxito.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      setState(() => _isActionLoading = false);
      _showErrorSnackBar(e);
    }
  }

  Future<void> _firmarContrato() async {
    setState(() => _isActionLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      // Simulate signing by uploading custom contract document kind
      await client.dio.post('/drivers/me/documents', data: {
        'kind': 'OTRO',
        'documentNumber': 'CONTRATO-FIRMADO',
        'fileUrl': 'https://chaskirutas-s3.s3.amazonaws.com/contrato.jpg',
      });
      await ref.read(authProvider.notifier).fetchProfile();
      setState(() => _isActionLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Paso 4: Contrato firmado digitalmente con éxito.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      setState(() => _isActionLoading = false);
      _showErrorSnackBar(e);
    }
  }

  Future<void> _verifyAndActivateDocs() async {
    setState(() => _isActionLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      // Find document list
      final docRes = await client.dio.get('/drivers/me/documents');
      final List docs = docRes.data;
      
      if (docs.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No tienes documentos para verificar'), backgroundColor: Colors.red),
        );
        setState(() => _isActionLoading = false);
        return;
      }

      for (var doc in docs) {
        if (!doc['isVerified']) {
          await client.dio.patch('/admin/documents/${doc['id']}/verify', data: {
            'isVerified': true,
          });
        }
      }

      await ref.read(authProvider.notifier).fetchProfile();
      setState(() => _isActionLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('¡Documentos aprobados por el Administrador! Cuenta activada.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      setState(() => _isActionLoading = false);
      _showErrorSnackBar(e);
    }
  }

  void _showErrorSnackBar(dynamic e) {
    if (mounted) {
      String msg = 'Error en la petición';
      if (e != null && (e as dynamic).response != null && (e as dynamic).response.data != null) {
        final raw = (e as dynamic).response.data['message'];
        msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red),
      );
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
              flex: 3,
              child: ListView(
                children: [
                  _buildStepTile(1, 'Validar DNI y Selfie Biométrica', step > 1),
                  _buildStepTile(2, 'Subir Licencia de Conducir y Antecedentes', step > 2),
                  _buildStepTile(3, 'Registrar Vehículo (SOAT y Tarjeta Propiedad)', step > 3),
                  _buildStepTile(4, 'Firmar Contrato Digital de Afiliación', step > 4),
                  _buildStepTile(5, 'Declaración Jurada y Pago de Derecho de Trámite', step > 5),
                  _buildStepTile(6, 'TUC (Tarjeta Única de Concesión) Emitida', step >= 6),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              flex: 4,
              child: Card(
                color: ChaskiTheme.cardColor,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: SingleChildScrollView(
                    child: _buildActiveStepForm(step),
                  ),
                ),
              ),
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

  Widget _buildActiveStepForm(int step) {
    if (_isActionLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: CircularProgressIndicator(color: ChaskiTheme.primary),
        ),
      );
    }

    switch (step) {
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Paso 1: Validar DNI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: ChaskiTheme.primary)),
            const SizedBox(height: 12),
            TextField(
              controller: _dniInputController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Número de DNI',
                hintText: '8 dígitos',
                prefixIcon: Icon(Icons.badge_rounded),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _uploadDni(_dniInputController.text.trim()),
              icon: const Icon(Icons.camera_alt_rounded),
              label: const Text('Subir Documento y Selfie'),
            ),
          ],
        );
      case 2:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Paso 2: Licencia de Conducir', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: ChaskiTheme.primary)),
            const SizedBox(height: 12),
            TextField(
              controller: _licenseInputController,
              decoration: const InputDecoration(
                labelText: 'Número de Licencia',
                prefixIcon: Icon(Icons.drive_eta_rounded),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _licenseClassInputController,
              decoration: const InputDecoration(
                labelText: 'Categoría (Clase)',
                hintText: 'A-I, A-IIa',
                prefixIcon: Icon(Icons.star_rounded),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _licenseExpiresInputController,
              decoration: const InputDecoration(
                labelText: 'Fecha de Expiración',
                hintText: 'YYYY-MM-DD',
                prefixIcon: Icon(Icons.calendar_today_rounded),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _uploadLicencia(
                _licenseInputController.text.trim(),
                _licenseClassInputController.text.trim(),
                _licenseExpiresInputController.text.trim(),
              ),
              icon: const Icon(Icons.upload_file_rounded),
              label: const Text('Subir Licencia'),
            ),
          ],
        );
      case 3:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Paso 3: Registrar Vehículo y SOAT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: ChaskiTheme.primary)),
            const SizedBox(height: 12),
            TextField(
              controller: _vehiclePlateController,
              decoration: const InputDecoration(
                labelText: 'Placa del Vehículo',
                hintText: 'ABC-123',
                prefixIcon: Icon(Icons.credit_card_rounded),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _vehicleBrandController,
                    decoration: const InputDecoration(labelText: 'Marca'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _vehicleModelController,
                    decoration: const InputDecoration(labelText: 'Modelo'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _vehicleYearController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Año'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _vehicleSeatsController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Asientos'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _registerVehicleAndSoat(
                _vehiclePlateController.text.trim(),
                _vehicleBrandController.text.trim(),
                _vehicleModelController.text.trim(),
                _vehicleYearController.text.trim(),
                _vehicleSeatsController.text.trim(),
              ),
              icon: const Icon(Icons.save_rounded),
              label: const Text('Registrar Vehículo y Subir SOAT'),
            ),
          ],
        );
      case 4:
      case 5:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Paso 4: Contrato y Aprobación', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: ChaskiTheme.primary)),
            const SizedBox(height: 8),
            const Text(
              'Tus documentos DNI, Licencia y SOAT se han subido con éxito y están en revisión por la ATU.',
              style: TextStyle(color: Colors.grey, fontSize: 13),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _firmarContrato,
              icon: const Icon(Icons.draw_rounded),
              label: const Text('Firmar Contrato Digital de Afiliación'),
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 8),
            const Text('🛠️ SIMULADOR DE APROBACIÓN (ADMIN)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.orange)),
            const SizedBox(height: 4),
            const Text(
              'Como estás en desarrollo, puedes simular la revisión y aprobación inmediata de tus documentos por el Administrador:',
              style: TextStyle(color: Colors.grey, fontSize: 11),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _verifyAndActivateDocs,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, foregroundColor: Colors.black),
              child: const Text('Aprobar Documentos y Activar Cuenta'),
            ),
          ],
        );
      default:
        return const Text('Formalización completada. Póngase online para recibir viajes.');
    }
  }
}
