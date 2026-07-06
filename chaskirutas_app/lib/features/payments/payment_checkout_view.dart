import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/api_client.dart';
import '../auth/auth_provider.dart';

class PaymentCheckoutView extends ConsumerStatefulWidget {
  final String bookingId;
  final double amount;

  const PaymentCheckoutView({super.key, required this.bookingId, required this.amount});

  @override
  ConsumerState<PaymentCheckoutView> createState() => _PaymentCheckoutViewState();
}

class _PaymentCheckoutViewState extends ConsumerState<PaymentCheckoutView> {
  bool _isProcessing = false;
  String? _selectedMethodId;
  List<dynamic> _methods = [];
  bool _isLoadingMethods = true;
  bool _paymentSuccess = false;
  String? _invoiceUrl;

  @override
  void initState() {
    super.initState();
    _fetchMethods();
  }

  Future<void> _fetchMethods() async {
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.get('/payments/methods');
      if (mounted) {
        setState(() {
          _methods = res.data;
          if (_methods.isNotEmpty) {
            _selectedMethodId = _methods.first['id'];
          }
          _isLoadingMethods = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingMethods = false);
    }
  }

  Future<void> _pay() async {
    if (_selectedMethodId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona una tarjeta'), backgroundColor: ChaskiTheme.warning),
      );
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.post('/payments/${widget.bookingId}/pay', data: {
        'paymentMethodId': _selectedMethodId,
      });

      if (mounted) {
        setState(() {
          _isProcessing = false;
          _paymentSuccess = true;
          _invoiceUrl = res.data['invoiceUrl'] ?? 'https://chaskirutas.com/invoice/${widget.bookingId}';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al procesar el pago'), backgroundColor: ChaskiTheme.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_paymentSuccess) {
      return Scaffold(
        backgroundColor: ChaskiTheme.background,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle_rounded, color: ChaskiTheme.success, size: 80),
                const SizedBox(height: 24),
                const Text(
                  '¡Pago exitoso!',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: ChaskiTheme.textPrimary),
                ),
                const SizedBox(height: 12),
                Text(
                  'Se han cobrado S/ ${widget.amount.toStringAsFixed(2)} de tu tarjeta.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, color: ChaskiTheme.textSecondary),
                ),
                const SizedBox(height: 32),
                ElevatedButton.icon(
                  onPressed: () {
                    // In a real app, use url_launcher to open _invoiceUrl
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Abriendo boleta: $_invoiceUrl')),
                    );
                  },
                  icon: const Icon(Icons.receipt_long_rounded),
                  label: const Text('Ver Boleta / Factura'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Volver al inicio', style: TextStyle(color: ChaskiTheme.primary, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      appBar: AppBar(title: const Text('Pago del Viaje')),
      body: _isLoadingMethods
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: ChaskiTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      children: [
                        const Text('Total a pagar', style: TextStyle(color: Colors.white70, fontSize: 16)),
                        const SizedBox(height: 8),
                        Text(
                          'S/ ${widget.amount.toStringAsFixed(2)}',
                          style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text('Selecciona método de pago', style: TextStyle(color: ChaskiTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  if (_methods.isEmpty)
                    const Text('No tienes tarjetas. Ve a "Mis Tarjetas" para añadir una.', style: TextStyle(color: ChaskiTheme.warning))
                  else
                    ..._methods.map((m) {
                      return RadioListTile<String>(
                        value: m['id'],
                        groupValue: _selectedMethodId,
                        onChanged: (val) => setState(() => _selectedMethodId = val),
                        title: Text(m['maskedLabel'] ?? '${m['brand'] ?? 'Tarjeta'} **** ${m['last4'] ?? ''}', style: const TextStyle(color: ChaskiTheme.textPrimary)),
                        activeColor: ChaskiTheme.primary,
                        contentPadding: EdgeInsets.zero,
                      );
                    }),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: _isProcessing || _methods.isEmpty ? null : _pay,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _isProcessing
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Confirmar Pago', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
    );
  }
}
