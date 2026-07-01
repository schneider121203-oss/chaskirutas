import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_provider.dart';
import '../../core/theme.dart';

class CollectivesView extends ConsumerStatefulWidget {
  const CollectivesView({super.key});

  @override
  ConsumerState<CollectivesView> createState() => _CollectivesViewState();
}

class _CollectivesViewState extends ConsumerState<CollectivesView> {
  List _routes = [];
  bool _isLoading = false;

  // Active booking form
  int? _selectedRouteId;
  String? _routeName;
  double _baseFare = 0;
  final _dniController = TextEditingController();
  final _cardController = TextEditingController(text: 'tok_test_card_payment');

  @override
  void initState() {
    super.initState();
    _fetchRoutes();
  }

  @override
  void dispose() {
    _dniController.dispose();
    _cardController.dispose();
    super.dispose();
  }

  Future<void> _fetchRoutes() async {
    setState(() => _isLoading = true);
    final client = ref.read(apiClientProvider);
    try {
      final res = await client.dio.get('/collectives');
      setState(() {
        _routes = res.data;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  void _createMockRoutes() async {
    final client = ref.read(apiClientProvider);
    try {
      // Register interprovincial routes
      await client.dio.post('/collectives', data: {
        'code': 'IP-300',
        'name': 'Lima - Jauja (Interprovincial)',
        'modality': 'COLECTIVO_M1',
        'jurisdictionId': 3, // DRTC Arequipa or DRTC / MTC
        'originDistrictId': 1,
        'destinationDistrictId': 2,
        'distanceKm': 250.00,
        'baseFarePen': 60.00,
        'seatsPerUnit:': 6,
      });

      await client.dio.post('/collectives', data: {
        'code': 'IP-301',
        'name': 'Cusco - Sicuani (Interprovincial)',
        'modality': 'COLECTIVO_M2',
        'jurisdictionId': 6, // Municipalidad Provincial del Cusco
        'originDistrictId': 1,
        'destinationDistrictId': 2,
        'distanceKm': 130.00,
        'baseFarePen': 25.00,
        'seatsPerUnit:': 8,
      });

      _fetchRoutes();
    } catch (e) {
      String msg = 'Error';
      if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
        final raw = (e as dynamic).response.data['message'];
        msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red),
      );
    }
  }

  void _bookCollective() async {
    if (_dniController.text.trim().length != 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('DNI debe tener 8 dígitos')),
      );
      return;
    }

    final client = ref.read(apiClientProvider);
    setState(() => _isLoading = true);
    try {
      final res = await client.dio.post('/collectives/${_selectedRouteId}/join', data: {
        'dni': _dniController.text.trim(),
        'paymentToken': _cardController.text.trim(),
      });

      setState(() => _isLoading = false);
      Navigator.pop(context); // Close sheet

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('🎉 ¡Reserva Confirmada!'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.green, size: 50),
              const SizedBox(height: 16),
              Text('Pasajero: ${res.data['verification']}'),
              Text('Asiento asignado: N° ${res.data['seatNumber']}'),
              Text('Depósito del 30% cobrado: S/ ${(res.data['depositCollectedPen'] as num).toStringAsFixed(2)}'),
              Text('Saldo a pagar en embarque: S/ ${(res.data['remainingAmountPen'] as num).toStringAsFixed(2)}'),
              const Divider(),
              const Text('Política: Reembolso completo si cancelas con 5 días o más de anticipación.', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Aceptar'),
            )
          ],
        ),
      );
    } catch (e) {
      setState(() => _isLoading = false);
      String msg = 'Error en reserva';
      if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
        final raw = (e as dynamic).response.data['message'];
        msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red),
      );
    }
  }

  void _testLimaBan() async {
    final client = ref.read(apiClientProvider);
    try {
      // Intentar crear un colectivo en Lima (Jurisdicción 1 = ATU_LIMA_CALLAO)
      await client.dio.post('/collectives', data: {
        'code': 'IP-BAN',
        'name': 'Lima - Miraflores (Colectivo Urbano)',
        'modality': 'COLECTIVO_M1',
        'jurisdictionId': 1, // ATU_LIMA_CALLAO
        'originDistrictId': 1,
        'destinationDistrictId': 2,
        'distanceKm': 15.00,
        'baseFarePen': 5.00,
      });
    } catch (e) {
      String msg = 'Error';
      if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
        final raw = (e as dynamic).response.data['message'];
        msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
      }
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.gavel_rounded, color: Colors.red),
              SizedBox(width: 8),
              Text('Bloqueo Legal ATU'),
            ],
          ),
          content: Text(msg),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Entendido'))
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Colectivos Ciudad a Ciudad',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              IconButton(
                onPressed: _fetchRoutes,
                icon: const Icon(Icons.refresh_rounded),
              )
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Servicio dual interprovincial formalizado bajo reglamento del MTC y Gobiernos Regionales.',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          if (_routes.isEmpty) ...[
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.airport_shuttle_rounded, size: 60, color: Colors.grey),
                    const SizedBox(height: 16),
                    const Text('No hay rutas interprovinciales disponibles', style: TextStyle(color: Colors.grey)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _createMockRoutes,
                      child: const Text('Cargar Rutas Interprovinciales Semilla'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _testLimaBan,
                      icon: const Icon(Icons.gavel_rounded, color: Colors.red),
                      label: const Text('Probar Bloqueo de Colectivo en Lima/Callao', style: TextStyle(color: Colors.red)),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            Expanded(
              child: ListView.builder(
                itemCount: _routes.length,
                itemBuilder: (context, index) {
                  final route = _routes[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 16),
                    child: ListTile(
                      leading: const Icon(Icons.airport_shuttle_rounded, size: 36, color: ChaskiTheme.primary),
                      title: Text(route['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('Tarifa: S/ ${(route['baseFarePen'] as num).toStringAsFixed(2)} | Reg: ${route['jurisdiction']['name']}'),
                      trailing: ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _selectedRouteId = route['id'];
                            _routeName = route['name'];
                            _baseFare = (route['baseFarePen'] as num).toDouble();
                          });
                          _showBookingSheet();
                        },
                        child: const Text('Reservar'),
                      ),
                    ),
                  );
                },
              ),
            ),
          ]
        ],
      ),
    );
  }

  void _showBookingSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: ChaskiTheme.cardColor,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          top: 24,
          left: 24,
          right: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Reserva de Pasaje Colectivo', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Ruta: $_routeName', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            const Text('Paso 1: Verificación de DNI en RENIEC', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _dniController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'DNI del pasajero', hintText: '8 dígitos'),
            ),
            const SizedBox(height: 16),
            Text('Paso 2: Depósito del 30% requerido (S/ ${(_baseFare * 0.3).toStringAsFixed(2)})', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _cardController,
              decoration: const InputDecoration(labelText: 'Token de Pago Culqi', hintText: 'tok_test_card_payment'),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _bookCollective,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Verificar DNI y Confirmar Pasaje'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
