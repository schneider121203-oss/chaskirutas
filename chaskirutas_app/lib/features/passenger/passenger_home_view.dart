import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../auth/auth_provider.dart';
import '../../core/theme.dart';
import '../../core/socket_service.dart';
import '../payments/payment_checkout_view.dart';
import '../trips/rating_view.dart';

class PassengerHomeView extends ConsumerStatefulWidget {
  const PassengerHomeView({super.key});

  @override
  ConsumerState<PassengerHomeView> createState() => _PassengerHomeViewState();
}

class _PassengerHomeViewState extends ConsumerState<PassengerHomeView> {
  // Paleta clara del bottom sheet (independiente del tema oscuro global de la
  // app): fondo blanco/gris muy claro con texto oscuro, según especificación.
  static const Color _sheetBg = Colors.white;
  static const Color _sheetBgAlt = Color(0xFFF8F9FA);
  static const Color _sheetTextPrimary = Color(0xFF111827);
  static const Color _sheetTextSecondary = Color(0xFF6B7280);

  final _originController = TextEditingController(text: 'Mi ubicación actual');
  final _destController = TextEditingController();
  
  GoogleMapController? _mapController;
  LatLng _myLocation = const LatLng(-12.046374, -77.042793); // Centro de Lima
  LatLng? _destinationLatLng;
  LatLng? _driverLatLng;
  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};
  String? _tripStatus;

  bool _isEstimating = false;
  double _distanceKm = 0;
  int _durationMin = 0;
  double _farePen = 0;
  double _proposedFare = 0;

  bool _isSearching = false;
  String? _bookingId;
  String? _tripId;
  String _matchStatus = 'Buscando ofertas...';
  Map<String, dynamic>? _matchedDriver;
  Timer? _tripStatusTimer;

  // Matching en tiempo real (WebSocket)
  final List<Map<String, dynamic>> _offers = [];
  bool _socketReady = false;

  // Dynamic route selection variables
  List<dynamic> _routes = [];
  dynamic _selectedRoute;
  bool _isLoadingRoutes = false;

  static const Map<String, LatLng> _districtCoordinates = {
    'San Isidro': LatLng(-12.0977, -77.0365),
    'Miraflores': LatLng(-12.1191, -77.0301),
    'Surco': LatLng(-12.1464, -76.9919),
    'San Borja': LatLng(-12.1067, -76.9986),
    'La Molina': LatLng(-12.0833, -76.9333),
    'Callao': LatLng(-12.0566, -77.1181),
    'Los Olivos': LatLng(-11.9581, -77.0636),
    'SMP': LatLng(-11.9778, -77.0522),
    'Ate': LatLng(-12.0247, -76.9186),
    'SJL': LatLng(-11.9655, -76.9672),
    'Cercado de Lima': LatLng(-12.0464, -77.0428),
    'Barranco': LatLng(-12.1503, -77.0219),
    'Jesús María': LatLng(-12.0717, -77.0442),
    'Lince': LatLng(-12.0833, -77.0333),
    'Pueblo Libre': LatLng(-12.0747, -77.0639),
    'Rímac': LatLng(-12.0250, -77.0300),
    'Villa El Salvador': LatLng(-12.2125, -76.9436),
    'Chorrillos': LatLng(-12.1708, -77.0150),
    'Breña': LatLng(-12.0589, -77.0531),
    'Independencia': LatLng(-11.9833, -77.0500),
  };

  @override
  void initState() {
    super.initState();
    _determinePosition();
    _fetchRoutes();
  }

  @override
  void dispose() {
    _disconnectSocket();
    _originController.dispose();
    _destController.dispose();
    _tripStatusTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchRoutes() async {
    setState(() => _isLoadingRoutes = true);
    final client = ref.read(apiClientProvider);
    try {
      final res = await client.dio.get('/trips/routes');
      setState(() {
        _routes = res.data;
        _isLoadingRoutes = false;
        if (_routes.isNotEmpty) {
          _selectRoute(_routes.first);
        }
      });
    } catch (_) {
      setState(() => _isLoadingRoutes = false);
    }
  }

  void _selectRoute(dynamic route) {
    setState(() {
      _selectedRoute = route;
      final originName = route['originDistrict']['name'];
      final destName = route['destinationDistrict']['name'];
      
      _originController.text = originName;
      _destController.text = destName;
      
      _myLocation = _districtCoordinates[originName] ?? const LatLng(-12.046374, -77.042793);
      _destinationLatLng = _districtCoordinates[destName] ?? const LatLng(-12.046374, -77.042793);
      
      _updateMarkers();
      
      if (_mapController != null) {
        _mapController!.animateCamera(
          CameraUpdate.newLatLngZoom(_myLocation, 14),
        );
      }
    });
    
    _getEstimate();
  }

  Future<void> _determinePosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }
      
      if (permission == LocationPermission.deniedForever) return;

      final position = await Geolocator.getCurrentPosition();
      setState(() {
        _myLocation = LatLng(position.latitude, position.longitude);
        _updateMarkers();
      });

      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(_myLocation, 15),
      );
    } catch (_) {}
  }

  void _updateMarkers() {
    _markers.clear();
    
    // Marcador de origen
    _markers.add(
      Marker(
        markerId: const MarkerId('origin'),
        position: _myLocation,
        infoWindow: const InfoWindow(title: 'Origen (Tú)'),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
      ),
    );

    // Marcador de destino
    if (_destinationLatLng != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('destination'),
          position: _destinationLatLng!,
          infoWindow: const InfoWindow(title: 'Destino'),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        ),
      );
    }
  }

  void _onMapTapped(LatLng position) {
    if (_isSearching) return;
    setState(() {
      _destinationLatLng = position;
      _destController.text = '${position.latitude.toStringAsFixed(5)}, ${position.longitude.toStringAsFixed(5)}';
      _updateMarkers();
    });

    _getEstimate();
  }

  void _getEstimate() async {
    if (_destinationLatLng == null) return;
    
    setState(() => _isEstimating = true);
    final client = ref.read(apiClientProvider);

    try {
      final res = await client.dio.post('/trips/estimate', data: {
        'startLat': _myLocation.latitude,
        'startLng': _myLocation.longitude,
        'endLat': _destinationLatLng!.latitude,
        'endLng': _destinationLatLng!.longitude,
      });

      setState(() {
        _distanceKm = (res.data['distanceKm'] as num).toDouble();
        _durationMin = (res.data['durationMinutes'] as num).toInt();
        _farePen = (res.data['farePEN'] as num).toDouble();
        _proposedFare = _farePen;
        _isEstimating = false;
      });
    } catch (e) {
      setState(() => _isEstimating = false);
    }
  }

  void _requestRide() async {
    if (_destinationLatLng == null) return;
    
    setState(() {
      _isSearching = true;
      _matchStatus = 'Buscando conductores cercanos...';
      _matchedDriver = null;
      _offers.clear();
    });

    final client = ref.read(apiClientProvider);
    try {
      final res = await client.dio.post('/trips/request', data: {
        'routeId': _selectedRoute != null ? _selectedRoute['id'] : 1,
        'startLat': _myLocation.latitude,
        'startLng': _myLocation.longitude,
        'endLat': _destinationLatLng!.latitude,
        'endLng': _destinationLatLng!.longitude,
        'proposedFare': _proposedFare,
      });

      _bookingId = res.data['bookingId'];
      _tripId = res.data['trip']['id'];

      // Emitir la solicitud por WebSocket a los conductores en 5 km.
      _emitRideRequestOverSocket();

      setState(() {
        _matchStatus = 'Esperando ofertas de conductores...';
      });

      _startStatusPolling();
    } catch (e) {
      String msg = 'No hay conductores activos';
      if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
        final raw = (e as dynamic).response.data['message'];
        msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
      }
      setState(() {
        _isSearching = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red),
      );
    }
  }

  // ── Matching en tiempo real (WebSocket) ─────────────────────────────────────

  void _emitRideRequestOverSocket() {
    if (_tripId == null) return;
    final profile = ref.read(authProvider).userProfile;
    final passengerName = profile?['fullName']?.toString() ?? 'Pasajero';
    final passengerId = profile?['id']?.toString();

    final socket = ref.read(socketServiceProvider);
    socket.connect();
    _setupPassengerListeners(socket);
    _socketReady = true;

    socket.emit('passenger:request-ride', {
      'tripId': _tripId,
      'passengerId': passengerId,
      'passengerName': passengerName,
      'startLat': _myLocation.latitude,
      'startLng': _myLocation.longitude,
      'endLat': _destinationLatLng?.latitude,
      'endLng': _destinationLatLng?.longitude,
      'proposedFare': _proposedFare,
    });
  }

  void _setupPassengerListeners(SocketService socket) {
    socket.off('passenger:offer-received');
    socket.off('passenger:driver-location');

    socket.on('passenger:offer-received', (data) {
      if (!mounted) return;
      final offer = Map<String, dynamic>.from(data as Map);
      setState(() {
        // Reemplazar oferta previa del mismo conductor (dedupe).
        _offers.removeWhere((o) => o['driverId'] == offer['driverId']);
        _offers.add(offer);
        if (_matchedDriver == null) {
          _matchStatus = '${_offers.length} oferta(s) recibida(s). Elige una:';
        }
      });
    });

    socket.on('passenger:driver-location', (data) {
      if (!mounted) return;
      final m = data as Map;
      final lat = double.tryParse(m['lat'].toString());
      final lng = double.tryParse(m['lng'].toString());
      if (lat != null && lng != null) _updateDriverMarker(lat, lng);
    });
  }

  // El pasajero acepta una oferta específica de un conductor.
  void _acceptOffer(Map<String, dynamic> offer) {
    if (_tripId == null) return;
    final socket = ref.read(socketServiceProvider);
    socket.emit('passenger:accept-offer', {
      'tripId': _tripId,
      'driverId': offer['driverId'],
      'offerFare': offer['offerFare'],
    });
    setState(() {
      _proposedFare = double.tryParse(offer['offerFare'].toString()) ?? _proposedFare;
      _matchedDriver = {
        'id': offer['driverId'],
        'fullName': offer['driverName'] ?? 'Conductor',
        'rating': offer['rating'],
        'vehicle': offer['vehicle'],
      };
      _matchStatus = '¡Oferta aceptada! El conductor viene en camino.';
      _offers.clear();
    });
  }

  void _updateDriverMarker(double lat, double lng) {
    final pos = LatLng(lat, lng);
    setState(() {
      _driverLatLng = pos;
      _markers.removeWhere((m) => m.markerId.value == 'driver');
      _markers.add(
        Marker(
          markerId: const MarkerId('driver'),
          position: pos,
          infoWindow: const InfoWindow(title: 'Tu conductor'),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        ),
      );
      _updateRoutePolyline();
    });
    _mapController?.animateCamera(CameraUpdate.newLatLng(pos));
  }

  // Traza el recorrido en vivo: una vez que el viaje se inicia (EN_CURSO), dibuja
  // la línea desde la posición actual del conductor hasta el destino final.
  void _updateRoutePolyline() {
    _polylines.removeWhere((p) => p.polylineId.value == 'route');
    if (_tripStatus == 'EN_CURSO' && _destinationLatLng != null) {
      _polylines.add(
        Polyline(
          polylineId: const PolylineId('route'),
          points: [_driverLatLng ?? _myLocation, _destinationLatLng!],
          color: ChaskiTheme.primary,
          width: 4,
          patterns: [PatternItem.dash(20), PatternItem.gap(10)],
        ),
      );
    }
  }

  void _disconnectSocket() {
    if (_socketReady) {
      final socket = ref.read(socketServiceProvider);
      socket.off('passenger:offer-received');
      socket.off('passenger:driver-location');
      socket.disconnect();
      _socketReady = false;
    }
  }

  // Envoltorio común del bottom sheet: fondo claro, esquinas superiores
  // redondeadas, sombra flotante y altura máxima de 35% de la pantalla para
  // que el mapa quede siempre visible detrás.
  Widget _bottomSheetShell(Widget child) {
    final maxHeight = MediaQuery.of(context).size.height * 0.35;
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: Container(
        decoration: const BoxDecoration(
          color: _sheetBg,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(color: Colors.black26, blurRadius: 24, offset: Offset(0, -6)),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE5E7EB),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Flexible(child: SingleChildScrollView(child: child)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Contenido del sheet mientras se buscan ofertas o ya hay conductor asignado.
  Widget _buildSearchSheetContent() {
    if (_matchedDriver != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_matchStatus, style: const TextStyle(color: ChaskiTheme.accent, fontWeight: FontWeight.bold, fontSize: 14)),
          const Divider(color: Color(0xFFE5E7EB)),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(backgroundColor: ChaskiTheme.primary, child: Icon(Icons.person, color: Colors.white)),
            title: Text(_matchedDriver!['fullName'] ?? 'Conductor', style: const TextStyle(color: _sheetTextPrimary, fontWeight: FontWeight.w600)),
            subtitle: Text([
              if (_matchedDriver!['vehicle'] != null) _matchedDriver!['vehicle'],
              '⭐ ${(_matchedDriver!['rating'] as num?)?.toStringAsFixed(1) ?? '5.0'}',
            ].join(' · '), style: const TextStyle(color: _sheetTextSecondary)),
            trailing: Text('S/ ${_proposedFare.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: ChaskiTheme.primary)),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            if (_offers.isEmpty) ...[
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: ChaskiTheme.primary),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Text(
                _matchStatus,
                style: const TextStyle(fontSize: 14, color: _sheetTextPrimary, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        if (_offers.isNotEmpty) ...[
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 160),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: _offers.length,
              itemBuilder: (context, i) {
                final o = _offers[i];
                final fare = double.tryParse(o['offerFare'].toString()) ?? 0;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: _sheetBgAlt, borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      const CircleAvatar(backgroundColor: ChaskiTheme.secondary, radius: 18, child: Icon(Icons.local_taxi, color: Colors.white, size: 18)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(o['driverName'] ?? 'Conductor', style: const TextStyle(color: _sheetTextPrimary, fontWeight: FontWeight.w600)),
                            Text([
                              if (o['vehicle'] != null && '${o['vehicle']}'.isNotEmpty) o['vehicle'],
                              if (o['rating'] != null) '⭐ ${o['rating']}',
                            ].join(' · '), style: const TextStyle(color: _sheetTextSecondary, fontSize: 12)),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () => _acceptOffer(o),
                        child: Text('S/ ${fare.toStringAsFixed(2)}'),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
        const SizedBox(height: 8),
        TextButton(
          onPressed: _resetTripState,
          child: const Text('Cancelar búsqueda', style: TextStyle(color: _sheetTextSecondary)),
        ),
      ],
    );
  }

  // Contenido del sheet con la estimación de tarifa y el botón de solicitud.
  Widget _buildFareSheetContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Distancia: ${_distanceKm.toStringAsFixed(1)} km', style: const TextStyle(fontSize: 15, color: _sheetTextPrimary, fontWeight: FontWeight.w600)),
            Text('Tiempo: $_durationMin mins', style: const TextStyle(fontSize: 15, color: _sheetTextPrimary, fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 14),
        const Text('Tarifa sugerida:', style: TextStyle(color: _sheetTextSecondary, fontSize: 13)),
        Text(
          'S/ ${_farePen.toStringAsFixed(2)}',
          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: ChaskiTheme.primary),
        ),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton.filled(
              onPressed: () {
                if (_proposedFare > 5) setState(() => _proposedFare -= 1.0);
              },
              icon: const Icon(Icons.remove),
            ),
            const SizedBox(width: 16),
            Text(
              'S/ ${_proposedFare.toStringAsFixed(2)}',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: _sheetTextPrimary),
            ),
            const SizedBox(width: 16),
            IconButton.filled(
              onPressed: () => setState(() => _proposedFare += 1.0),
              icon: const Icon(Icons.add),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _requestRide,
          child: const Text('Solicitar Viaje'),
        ),
      ],
    );
  }

  void _startStatusPolling() {
    _tripStatusTimer?.cancel();
    _tripStatusTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final client = ref.read(apiClientProvider);
      try {
        final res = await client.dio.get('/trips/$_tripId');
        final status = res.data['status'];
        final driver = res.data['driver'];
        
        setState(() {
          _tripStatus = status;
          if (status == 'RESERVADO') {
            _matchStatus = 'Esperando a que el conductor acepte el viaje...';
          } else if (status == 'EN_CAMINO') {
            _matchStatus = '¡Viaje aceptado! El conductor está en camino a recogerte.';
            if (driver != null) {
              _matchedDriver = {
                'id': driver['id'],
                'fullName': driver['user']?['fullName'] ?? 'Conductor',
                'phone': driver['user']?['phoneE164'],
                'rating': driver['ratingAvg'] != null ? double.parse(driver['ratingAvg'].toString()) : 5.0,
              };
            }
          } else if (status == 'EN_CURSO') {
            _matchStatus = 'Viaje en progreso... Disfruta de la ruta de ChaskiRutas.';
          } else if (status == 'COMPLETADO') {
            timer.cancel();
            _showTripCompletedDialog();
          }
          _updateRoutePolyline();
        });
      } catch (_) {}
    });
  }

  void _showTripCompletedDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('¡Viaje Completado!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.check_circle_outline_rounded, size: 60, color: Colors.green),
            const SizedBox(height: 12),
            const Text('Tu viaje ha finalizado con éxito.'),
            const SizedBox(height: 8),
            Text('Tarifa final pagada: S/ ${_proposedFare.toStringAsFixed(2)}'),
            const SizedBox(height: 4),
            const Text('Comprobante SUNAT (Boleta electrónica) emitido automáticamente.', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _resetTripState();
            },
            child: const Text('Cerrar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _payAndRate();
            },
            child: const Text('Pagar y calificar'),
          ),
        ],
      ),
    );
  }

  // Encadena el pago del viaje (checkout con tarjeta Culqi) y la calificación del conductor.
  Future<void> _payAndRate() async {
    final bookingId = _bookingId;
    if (bookingId == null) {
      _resetTripState();
      return;
    }

    // 1. Checkout de pago
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentCheckoutView(bookingId: bookingId, amount: _proposedFare),
      ),
    );
    if (!mounted) return;

    // 2. Calificación del conductor (por bookingId)
    final driverName = _matchedDriver?['fullName'] as String? ?? 'Conductor';
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RatingView(bookingId: bookingId, targetName: '$driverName (Conductor)'),
      ),
    );
    if (!mounted) return;

    _resetTripState();
  }

  void _resetTripState() {
    _disconnectSocket();
    setState(() {
      _isSearching = false;
      _bookingId = null;
      _tripId = null;
      _tripStatus = null;
      _driverLatLng = null;
      _matchedDriver = null;
      _offers.clear();
      _destinationLatLng = null;
      _destController.clear();
      _markers.removeWhere((m) => m.markerId.value == 'driver');
      _polylines.clear();
      _updateMarkers();
    });
  }

  @override
  Widget build(BuildContext context) {
    // El mapa ocupa el 100% de la pantalla; toda la demás UI flota encima en
    // un Stack, en vez de compartir el espacio en una Column (que antes
    // encogía el mapa cada vez que aparecía el panel inferior).
    return Stack(
      children: [
        Positioned.fill(
          child: GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _myLocation,
              zoom: 14.0,
            ),
            onMapCreated: (controller) {
              _mapController = controller;
              _determinePosition();
            },
            markers: _markers,
            polylines: _polylines,
            onTap: _onMapTapped,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
          ),
        ),
        Positioned(
          top: 24,
          left: 24,
          right: 24,
          child: Container(
            decoration: ChaskiTheme.glassDecoration,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                if (_isLoadingRoutes) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8.0),
                    child: LinearProgressIndicator(color: ChaskiTheme.primary),
                  ),
                ] else if (_routes.isNotEmpty) ...[
                  DropdownButtonFormField<dynamic>(
                    value: _selectedRoute,
                    dropdownColor: ChaskiTheme.cardColor,
                    decoration: const InputDecoration(
                      labelText: 'Ruta de Taxi',
                      prefixIcon: Icon(Icons.map_rounded, color: ChaskiTheme.primary),
                    ),
                    items: _routes.map((route) {
                      return DropdownMenuItem<dynamic>(
                        value: route,
                        child: Text(
                          route['name'] ?? '',
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        _selectRoute(val);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _originController,
                  readOnly: true,
                  decoration: const InputDecoration(
                    hintText: 'Origen',
                    prefixIcon: Icon(Icons.my_location_rounded, color: Colors.amber),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _destController,
                  readOnly: true,
                  decoration: const InputDecoration(
                    hintText: 'Toca el mapa para fijar destino',
                    prefixIcon: Icon(Icons.location_on_rounded, color: Colors.red),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_isEstimating)
          const Center(
            child: Card(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(strokeWidth: 3),
                    SizedBox(width: 16),
                    Text('Calculando ruta y tarifa...'),
                  ],
                ),
              ),
            ),
          ),
        // Bottom sheet claro: nunca cubre más del 35% de la pantalla, el mapa
        // permanece visible en todo momento detrás.
        if (_isSearching)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _bottomSheetShell(_buildSearchSheetContent()),
          )
        else if (_farePen > 0)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _bottomSheetShell(_buildFareSheetContent()),
          ),
      ],
    );
  }
}
