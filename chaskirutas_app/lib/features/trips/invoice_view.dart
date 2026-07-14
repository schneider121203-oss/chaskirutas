import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../auth/auth_provider.dart';

/// Boleta electrónica visual de un viaje. Consume GET /trips/:tripId/invoice.
class InvoiceView extends ConsumerStatefulWidget {
  final String tripId;
  const InvoiceView({super.key, required this.tripId});

  @override
  ConsumerState<InvoiceView> createState() => _InvoiceViewState();
}

class _InvoiceViewState extends ConsumerState<InvoiceView> {
  Map<String, dynamic>? _inv;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.get('/trips/${widget.tripId}/invoice');
      setState(() {
        _inv = res.data as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Aún no se ha generado la boleta de este viaje.';
        _loading = false;
      });
    }
  }

  String _money(dynamic v) => 'S/ ${(v is num ? v : num.tryParse('$v') ?? 0).toStringAsFixed(2)}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      appBar: AppBar(title: const Text('Boleta Electrónica')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: ChaskiTheme.primary))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: ChaskiTheme.textSecondary)))
              : _buildBoleta(),
    );
  }

  Widget _buildBoleta() {
    final inv = _inv!;
    final emisor = inv['emisor'] ?? {};
    final cliente = inv['cliente'] ?? {};
    final montos = inv['montos'] ?? {};
    final serie = '${inv['serie'] ?? ''}-${inv['numero'] ?? ''}';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: ChaskiTheme.cardShadow,
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Encabezado emisor
                Center(
                  child: Column(
                    children: [
                      const Icon(Icons.local_taxi_rounded, color: ChaskiTheme.primary, size: 40),
                      const SizedBox(height: 8),
                      Text(emisor['razonSocial'] ?? 'ChaskiRutas',
                          style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w800, fontSize: 16), textAlign: TextAlign.center),
                      Text('RUC: ${emisor['ruc'] ?? '—'}', style: const TextStyle(color: Colors.black54, fontSize: 13)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(border: Border.all(color: Colors.black26), borderRadius: BorderRadius.circular(8)),
                  child: Column(
                    children: [
                      const Text('BOLETA DE VENTA ELECTRÓNICA', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 13)),
                      Text(serie, style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w900, fontSize: 18)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _line('Fecha', _fmtDate(inv['emitidaEl'])),
                _line('Cliente', cliente['nombre'] ?? '—'),
                _line('${cliente['tipoDoc'] ?? 'DOC'}', cliente['doc'] ?? '—'),
                _line('Descripción', inv['ruta'] ?? 'Servicio de transporte'),
                const Divider(height: 28, color: Colors.black12),
                _amount('Op. Gravada', _money(montos['subtotal']), false),
                _amount('IGV (18%)', _money(montos['igv']), false),
                const SizedBox(height: 6),
                _amount('TOTAL', _money(montos['total']), true),
                const SizedBox(height: 16),
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: ChaskiTheme.accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.verified_rounded, color: ChaskiTheme.accent, size: 16),
                      const SizedBox(width: 6),
                      Text('SUNAT: ${inv['sunatStatus'] ?? 'ACEPTADO'}', style: const TextStyle(color: ChaskiTheme.accent, fontWeight: FontWeight.bold, fontSize: 12)),
                    ]),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Text('Comprobante electrónico emitido conforme a la SUNAT.',
              style: TextStyle(color: ChaskiTheme.textSecondary, fontSize: 12), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  String _fmtDate(dynamic v) {
    if (v == null) return '—';
    try {
      return DateTime.parse('$v').toLocal().toString().substring(0, 16);
    } catch (_) {
      return '$v';
    }
  }

  Widget _line(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(color: Colors.black54, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(color: Colors.black87, fontSize: 13, fontWeight: FontWeight.w500))),
        ]),
      );

  Widget _amount(String label, String value, bool total) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: total ? Colors.black : Colors.black54, fontSize: total ? 18 : 14, fontWeight: total ? FontWeight.w900 : FontWeight.w500)),
          Text(value, style: TextStyle(color: total ? ChaskiTheme.primary : Colors.black87, fontSize: total ? 20 : 14, fontWeight: total ? FontWeight.w900 : FontWeight.w600)),
        ],
      );
}
