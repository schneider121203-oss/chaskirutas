import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/api_client.dart';
import '../auth/auth_provider.dart';

class DriverVehicleView extends ConsumerStatefulWidget {
  const DriverVehicleView({super.key});

  @override
  ConsumerState<DriverVehicleView> createState() => _DriverVehicleViewState();
}

class _DriverVehicleViewState extends ConsumerState<DriverVehicleView> {
  bool _isLoading = true;
  Map<String, dynamic>? _vehicle;

  @override
  void initState() {
    super.initState();
    _fetchVehicle();
  }

  Future<void> _fetchVehicle() async {
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.get('/drivers/me/vehicle');
      if (mounted) {
        setState(() {
          _vehicle = res.data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      appBar: AppBar(title: const Text('Mi Vehículo')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _vehicle == null
              ? _buildEmptyState()
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          gradient: ChaskiTheme.conductorGradient,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: ChaskiTheme.conductorGlow,
                        ),
                        child: Column(
                          children: [
                            const Icon(Icons.directions_car_rounded, size: 64, color: Colors.white),
                            const SizedBox(height: 16),
                            Text(
                              _vehicle?['plate'] ?? 'S/N PLACA',
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: 2,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      _InfoRow(label: 'Marca', value: _vehicle?['brand'] ?? 'N/A'),
                      const Divider(color: ChaskiTheme.border, height: 32),
                      _InfoRow(label: 'Modelo', value: _vehicle?['model'] ?? 'N/A'),
                      const Divider(color: ChaskiTheme.border, height: 32),
                      _InfoRow(label: 'Color', value: _vehicle?['color'] ?? 'N/A'),
                      const Divider(color: ChaskiTheme.border, height: 32),
                      _InfoRow(label: 'Año', value: _vehicle?['year']?.toString() ?? 'N/A'),
                      const Divider(color: ChaskiTheme.border, height: 32),
                      _InfoRow(label: 'Capacidad', value: '${_vehicle?['capacity'] ?? 0} asientos'),
                    ],
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.directions_car_rounded, size: 64, color: ChaskiTheme.textSecondary.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            const Text(
              'No tienes un vehículo registrado.',
              textAlign: TextAlign.center,
              style: TextStyle(color: ChaskiTheme.textSecondary, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 15,
            color: ChaskiTheme.textSecondary,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: ChaskiTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
