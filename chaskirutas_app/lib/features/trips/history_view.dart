import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/api_client.dart';
import '../auth/auth_provider.dart';

class HistoryView extends ConsumerStatefulWidget {
  const HistoryView({super.key});

  @override
  ConsumerState<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends ConsumerState<HistoryView> {
  bool _isLoading = true;
  List<dynamic> _trips = [];

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.get('/trips/history');
      if (mounted) {
        setState(() {
          _trips = res.data;
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
      appBar: AppBar(title: const Text('Historial de Viajes')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _trips.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: _trips.length,
                  itemBuilder: (context, index) {
                    final trip = _trips[index];
                    return _TripHistoryCard(trip: trip);
                  },
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
            Icon(Icons.history_rounded, size: 64, color: ChaskiTheme.textSecondary.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            const Text(
              'Aún no tienes viajes registrados.',
              textAlign: TextAlign.center,
              style: TextStyle(color: ChaskiTheme.textSecondary, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}

class _TripHistoryCard extends ConsumerWidget {
  final Map<String, dynamic> trip;

  const _TripHistoryCard({required this.trip});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authProvider).userRole;
    final isDriver = role == 'CONDUCTOR';

    final status = trip['status'] ?? 'UNKNOWN';
    final amount = trip['fare'] != null ? 'S/ ${trip['fare']}' : 'S/ --';
    final date = trip['createdAt'] != null ? DateTime.parse(trip['createdAt']).toLocal().toString().substring(0, 16) : '--';
    
    Color statusColor;
    switch (status) {
      case 'COMPLETED':
        statusColor = ChaskiTheme.accent;
        break;
      case 'CANCELLED':
        statusColor = ChaskiTheme.danger;
        break;
      default:
        statusColor = ChaskiTheme.warning;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ChaskiTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ChaskiTheme.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(date, style: const TextStyle(color: ChaskiTheme.textSecondary, fontSize: 13)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status,
                  style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (isDriver ? ChaskiTheme.conductorGradient.colors.first : ChaskiTheme.primaryGradient.colors.first).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isDriver ? Icons.person_rounded : Icons.directions_car_rounded,
                  color: isDriver ? ChaskiTheme.secondary : ChaskiTheme.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isDriver ? (trip['passenger']?['fullName'] ?? 'Pasajero') : (trip['driver']?['fullName'] ?? 'Conductor'),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: ChaskiTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Ruta del viaje',
                      style: TextStyle(fontSize: 14, color: ChaskiTheme.textSecondary),
                    ),
                  ],
                ),
              ),
              Text(
                amount,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: ChaskiTheme.textPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
