import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../auth/auth_provider.dart';
import '../../core/theme.dart';

class PassengerHomeView extends ConsumerStatefulWidget {
  const PassengerHomeView({super.key});

  @override
  ConsumerState<PassengerHomeView> createState() => _PassengerHomeViewState();
}

class _PassengerHomeViewState extends ConsumerState<PassengerHomeView> {
  final _originController = TextEditingController(text: 'Mi ubicación actual');
  final _destController = TextEditingController();
  
  GoogleMapController? _mapController;
  LatLng _myLocation = const LatLng(-12.046374, -77.042793); // Centro de Lima
  LatLng? _destinationLatLng;
  final Set<Marker> _markers = {};

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

  @override
  void initState() {
    super.initState();
    _determinePosition();
  }

  @override
  void dispose() {
    _originController.dispose();
    _destController.dispose();
    _tripStatusTimer?.cancel();
    super.dispose();
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
      _matchStatus = 'Buscando conductores activos...';
    });

    final client = ref.read(apiClientProvider);
    try {
      final res = await client.dio.post('/trips/request', data: {
        'routeId': 1,
        'startLat': _myLocation.latitude,
        'startLng': _myLocation.longitude,
        'endLat': _destinationLatLng!.latitude,
        'endLng': _destinationLatLng!.longitude,
        'proposedFare': _proposedFare,
      });

      _bookingId = res.data['bookingId'];
      _tripId = res.data['trip']['id'];
      
      setState(() {
        _matchStatus = '¡Conductor encontrado!';
        _matchedDriver = res.data['driver'];
      });
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

  void _acceptOffer() async {
    if (_bookingId == null || _tripId == null) return;
    setState(() {
      _matchStatus = 'Aceptando conductor... Esperando confirmación de inicio de viaje.';
    });

    final client = ref.read(apiClientProvider);
    
    // Poll trip status until it is COMPLETED
    _tripStatusTimer?.cancel();
    _tripStatusTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }
      try {
        final res = await client.dio.get('/trips/$_tripId');
        final status = res.data['status'];
        
        setState(() {
          if (status == 'RESERVADO') {
            _matchStatus = 'Esperando a que el conductor acepte el viaje...';
          } else if (status == 'EN_CAMINO') {
            _matchStatus = '¡Viaje aceptado! El conductor está en camino a recogerte.';
          } else if (status == 'EN_CURSO') {
            _matchStatus = 'Viaje en progreso... Disfruta de la ruta de ChaskiRutas.';
          } else if (status == 'COMPLETADO') {
            timer.cancel();
            _showTripCompletedDialog();
          }
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
              setState(() {
                _isSearching = false;
                _bookingId = null;
                _tripId = null;
                _matchedDriver = null;
                _destinationLatLng = null;
                _destController.clear();
                _updateMarkers();
              });
            },
            child: const Text('Entendido'),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Mapa interactivo real de Google
        Expanded(
          child: Stack(
            children: [
              GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: _myLocation,
                  zoom: 14.0,
                ),
                onMapCreated: (controller) {
                  _mapController = controller;
                  _determinePosition();
                },
                markers: _markers,
                onTap: _onMapTapped,
                myLocationEnabled: true,
                myLocationButtonEnabled: false,
                zoomControlsEnabled: false,
                mapToolbarEnabled: false,
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
              if (_isSearching)
                Positioned.fill(
                  child: Container(
                    color: Colors.black.withOpacity(0.8),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(color: ChaskiTheme.primary),
                        const SizedBox(height: 24),
                        Text(
                          _matchStatus,
                          style: const TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                        ),
                        if (_matchedDriver != null && _matchStatus == '¡Conductor encontrado!') ...[
                          const SizedBox(height: 24),
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                children: [
                                  ListTile(
                                    leading: const CircleAvatar(
                                      child: Icon(Icons.person),
                                    ),
                                    title: Text(_matchedDriver!['fullName'] ?? 'Conductor de Prueba'),
                                    subtitle: Text('Calificación: ⭐ ${(_matchedDriver!['rating'] as num?)?.toStringAsFixed(1) ?? '5.0'}'),
                                  ),
                                  const Divider(),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Precio: S/ ${_proposedFare.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                      ElevatedButton(
                                        onPressed: _acceptOffer,
                                        child: const Text('Aceptar Oferta'),
                                      )
                                    ],
                                  )
                                ],
                              ),
                            ),
                          )
                        ]
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        // Panel de estimación y propuesta de tarifa
        if (_farePen > 0 && !_isSearching)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: ChaskiTheme.cardColor,
              borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Distancia: ${_distanceKm.toStringAsFixed(1)} km', style: const TextStyle(fontSize: 16)),
                    Text('Tiempo: $_durationMin mins', style: const TextStyle(fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 16),
                const Text('Tarifa sugerida:', style: TextStyle(color: Colors.grey)),
                Text(
                  'S/ ${_farePen.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: ChaskiTheme.primary),
                ),
                const SizedBox(height: 16),
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
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 16),
                    IconButton.filled(
                      onPressed: () => setState(() => _proposedFare += 1.0),
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _requestRide,
                  child: const Text('Solicitar Viaje'),
                ),
              ],
            ),
          )
      ],
    );
  }
}
