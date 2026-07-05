import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/api_client.dart';
import '../auth/auth_provider.dart';

class PaymentMethodsView extends ConsumerStatefulWidget {
  const PaymentMethodsView({super.key});

  @override
  ConsumerState<PaymentMethodsView> createState() => _PaymentMethodsViewState();
}

class _PaymentMethodsViewState extends ConsumerState<PaymentMethodsView> {
  bool _isLoading = true;
  List<dynamic> _methods = [];

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
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _addMethod() async {
    // This is a mockup for adding a card via Culqi tokenization
    // In a real scenario, this would open the Culqi webview/SDK
    final numController = TextEditingController();
    
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: ChaskiTheme.cardColor,
        title: const Text('Agregar Tarjeta (Simulación Culqi)', style: TextStyle(color: ChaskiTheme.textPrimary)),
        content: TextField(
          controller: numController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Número de Tarjeta (Ficticio)'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Simular Tokenización'),
          ),
        ],
      ),
    );

    if (result == true && numController.text.isNotEmpty) {
      setState(() => _isLoading = true);
      try {
        final client = ref.read(apiClientProvider);
        await client.dio.post('/payments/methods', data: {
          'method': 'TARJETA',
          'maskedLabel': 'Visa •••• 1234',
          'token': 'tkn_mock_${DateTime.now().millisecondsSinceEpoch}',
        });
        await _fetchMethods();
      } catch (e) {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deleteMethod(String id) async {
    setState(() => _isLoading = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.dio.delete('/payments/methods/$id');
      await _fetchMethods();
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      appBar: AppBar(title: const Text('Mis Tarjetas')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addMethod,
        backgroundColor: ChaskiTheme.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Añadir Tarjeta', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _methods.isEmpty
              ? const Center(child: Text('No tienes tarjetas guardadas.', style: TextStyle(color: ChaskiTheme.textSecondary)))
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: _methods.length,
                  itemBuilder: (context, index) {
                    final card = _methods[index];
                    return _CardItem(
                      brand: 'Visa', // Dummy for now since backend doesn't save brand directly in method array unless parsed from maskedLabel
                      last4: card['maskedLabel']?.toString().split(' ').last ?? '****',
                      onDelete: () => _deleteMethod(card['id']),
                    );
                  },
                ),
    );
  }
}

class _CardItem extends StatelessWidget {
  final String brand;
  final String last4;
  final VoidCallback onDelete;

  const _CardItem({required this.brand, required this.last4, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2A2D3E), Color(0xFF1E1F2A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ChaskiTheme.border),
      ),
      child: Row(
        children: [
          Icon(Icons.credit_card_rounded, color: ChaskiTheme.primary.withValues(alpha: 0.8), size: 32),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  brand.toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  '**** **** **** $last4',
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: ChaskiTheme.danger),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}
