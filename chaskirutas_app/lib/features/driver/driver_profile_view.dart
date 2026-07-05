import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/api_client.dart';
import '../auth/auth_provider.dart';

class DriverProfileView extends ConsumerStatefulWidget {
  const DriverProfileView({super.key});

  @override
  ConsumerState<DriverProfileView> createState() => _DriverProfileViewState();
}

class _DriverProfileViewState extends ConsumerState<DriverProfileView> {
  final _formKey = GlobalKey<FormState>();
  final _bankController = TextEditingController();
  final _accountController = TextEditingController();
  bool _isLoading = true;
  bool _isSaving = false;
  Map<String, dynamic>? _driverProfile;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.get('/drivers/me');
      if (mounted) {
        setState(() {
          _driverProfile = res.data;
          // The backend model might have these under 'bankInfo' or directly.
          final bankInfo = _driverProfile?['bankInfo'];
          _bankController.text = bankInfo?['bankName'] ?? _driverProfile?['bankName'] ?? '';
          _accountController.text = bankInfo?['accountNumber'] ?? _driverProfile?['accountNumber'] ?? '';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    try {
      final client = ref.read(apiClientProvider);
      await client.dio.patch('/drivers/me', data: {
        'bankName': _bankController.text.trim(),
        'accountNumber': _accountController.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Datos bancarios guardados'),
            backgroundColor: ChaskiTheme.accent,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Error al guardar datos'),
            backgroundColor: ChaskiTheme.danger,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _bankController.dispose();
    _accountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      appBar: AppBar(title: const Text('Cuenta Bancaria')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: ChaskiTheme.secondary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: ChaskiTheme.secondary.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: ChaskiTheme.secondary),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Esta cuenta será utilizada para depositar tus ganancias por los viajes realizados.',
                              style: TextStyle(color: ChaskiTheme.textSecondary, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: _bankController,
                      decoration: const InputDecoration(
                        labelText: 'Nombre del Banco',
                        hintText: 'Ej: BCP, Interbank',
                        prefixIcon: Icon(Icons.account_balance_rounded, color: ChaskiTheme.textSecondary),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Requerido' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _accountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Número de Cuenta',
                        hintText: 'Número de cuenta o CCI',
                        prefixIcon: Icon(Icons.numbers_rounded, color: ChaskiTheme.textSecondary),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Requerido' : null,
                    ),
                    const SizedBox(height: 36),
                    GestureDetector(
                      onTap: _isSaving ? null : _save,
                      child: Container(
                        height: 56,
                        decoration: BoxDecoration(
                          gradient: _isSaving ? null : ChaskiTheme.conductorGradient,
                          color: _isSaving ? ChaskiTheme.border : null,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: _isSaving ? null : ChaskiTheme.conductorGlow,
                        ),
                        child: Center(
                          child: _isSaving
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                                )
                              : const Text(
                                  'Guardar Datos',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                  ),
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
