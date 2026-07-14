import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import '../../core/theme.dart';

class RegisterView extends ConsumerStatefulWidget {
  const RegisterView({super.key});

  @override
  ConsumerState<RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends ConsumerState<RegisterView> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _dniController = TextEditingController();
  final _emailController = TextEditingController();

  // Driver fields
  final _licenseNumberController = TextEditingController();
  final _licenseClassController = TextEditingController();
  final _licenseExpiresController = TextEditingController();

  String _selectedRole = 'PASAJERO';

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _dniController.dispose();
    _emailController.dispose();
    _licenseNumberController.dispose();
    _licenseClassController.dispose();
    _licenseExpiresController.dispose();
    super.dispose();
  }

  Future<void> _pickLicenseDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year + 2, now.month, now.day),
      firstDate: now,
      lastDate: DateTime(now.year + 15),
      helpText: 'Vencimiento de la licencia',
    );
    if (picked != null) {
      final m = picked.month.toString().padLeft(2, '0');
      final d = picked.day.toString().padLeft(2, '0');
      _licenseExpiresController.text = '${picked.year}-$m-$d'; // formato AAAA-MM-DD
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).register(
      phone: _phoneController.text.trim(),
      password: _passwordController.text,
      fullName: _nameController.text.trim(),
      dni: _dniController.text.trim(),
      role: _selectedRole,
      email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      licenseNumber: _licenseNumberController.text.trim(),
      licenseClass: _licenseClassController.text.trim(),
      licenseExpiresAt: _licenseExpiresController.text.trim(),
    );

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('¡Registro exitoso! Por favor inicia sesión.'),
            backgroundColor: ChaskiTheme.accent,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        Navigator.pop(context);
      } else {
        final error = ref.read(authProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Error al registrarse'),
            backgroundColor: ChaskiTheme.danger,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Crear cuenta')),
      body: Container(
        decoration: const BoxDecoration(gradient: ChaskiTheme.backgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    '¡Únete a ChaskiRutas!',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: ChaskiTheme.textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Formalizando el transporte peruano',
                    style: TextStyle(fontSize: 14, color: ChaskiTheme.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),

                  // ── Role selector ──────────────────────────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedRole = 'PASAJERO'),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              gradient: _selectedRole == 'PASAJERO'
                                  ? ChaskiTheme.primaryGradient
                                  : null,
                              color: _selectedRole == 'PASAJERO' ? null : ChaskiTheme.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: _selectedRole == 'PASAJERO'
                                    ? ChaskiTheme.primary
                                    : ChaskiTheme.border,
                                width: 1.5,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.hail_rounded,
                                  color: _selectedRole == 'PASAJERO'
                                      ? Colors.white
                                      : ChaskiTheme.textSecondary,
                                  size: 28,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Pasajero',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: _selectedRole == 'PASAJERO'
                                        ? Colors.white
                                        : ChaskiTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedRole = 'CONDUCTOR'),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              gradient: _selectedRole == 'CONDUCTOR'
                                  ? ChaskiTheme.conductorGradient
                                  : null,
                              color: _selectedRole == 'CONDUCTOR' ? null : ChaskiTheme.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: _selectedRole == 'CONDUCTOR'
                                    ? ChaskiTheme.secondary
                                    : ChaskiTheme.border,
                                width: 1.5,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.drive_eta_rounded,
                                  color: _selectedRole == 'CONDUCTOR'
                                      ? Colors.white
                                      : ChaskiTheme.textSecondary,
                                  size: 28,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Conductor',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: _selectedRole == 'CONDUCTOR'
                                        ? Colors.white
                                        : ChaskiTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // ── Fields ─────────────────────────────────────────────────
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Nombre Completo',
                      hintText: 'Juan Pérez',
                      prefixIcon: Icon(Icons.person_rounded, color: ChaskiTheme.textSecondary),
                    ),
                    validator: (val) => val == null || val.isEmpty ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Celular',
                      hintText: '+51987654321',
                      prefixIcon: Icon(Icons.phone_iphone_rounded, color: ChaskiTheme.textSecondary),
                    ),
                    validator: (val) => val == null || !val.startsWith('+51') || val.length != 12
                        ? 'Formato: +51XXXXXXXXX'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _dniController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'DNI',
                      hintText: '8 dígitos',
                      prefixIcon: Icon(Icons.badge_rounded, color: ChaskiTheme.textSecondary),
                    ),
                    validator: (val) => val == null || val.length != 8 ? 'DNI debe tener 8 dígitos' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: Icon(Icons.lock_rounded, color: ChaskiTheme.textSecondary),
                    ),
                    validator: (val) => val == null || val.length < 6 ? 'Mínimo 6 caracteres' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Correo Electrónico (Opcional)',
                      prefixIcon: Icon(Icons.email_rounded, color: ChaskiTheme.textSecondary),
                    ),
                  ),

                  // ── Driver fields ──────────────────────────────────────────
                  if (_selectedRole == 'CONDUCTOR') ...[
                    const SizedBox(height: 28),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: ChaskiTheme.secondary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: ChaskiTheme.secondary.withValues(alpha: 0.3), width: 1),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.drive_eta_rounded, color: ChaskiTheme.secondary, size: 20),
                          SizedBox(width: 10),
                          Text(
                            'Datos de Brevete / Licencia',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: ChaskiTheme.secondary,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _licenseNumberController,
                      decoration: const InputDecoration(
                        labelText: 'Número de Licencia',
                        hintText: 'Q12345678',
                      ),
                      validator: (val) => _selectedRole == 'CONDUCTOR' && (val == null || val.isEmpty)
                          ? 'Requerido para conductor'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _licenseClassController,
                      decoration: const InputDecoration(
                        labelText: 'Clase/Categoría',
                        hintText: 'A-IIa',
                      ),
                      validator: (val) => _selectedRole == 'CONDUCTOR' && (val == null || val.isEmpty)
                          ? 'Requerido para conductor'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _licenseExpiresController,
                      readOnly: true,
                      onTap: _pickLicenseDate,
                      decoration: const InputDecoration(
                        labelText: 'Fecha de Expiración',
                        hintText: 'Toca para elegir la fecha',
                        suffixIcon: Icon(Icons.calendar_today_rounded, color: ChaskiTheme.textSecondary),
                      ),
                      validator: (val) => _selectedRole == 'CONDUCTOR' && (val == null || val.isEmpty)
                          ? 'Requerido para conductor'
                          : null,
                    ),
                  ],

                  const SizedBox(height: 36),
                  GestureDetector(
                    onTap: state.isLoading ? null : _submit,
                    child: Container(
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: state.isLoading ? null : ChaskiTheme.primaryGradient,
                        color: state.isLoading ? ChaskiTheme.border : null,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: state.isLoading ? null : ChaskiTheme.primaryGlow,
                      ),
                      child: Center(
                        child: state.isLoading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                              )
                            : const Text(
                                'Crear Cuenta',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 16,
                                ),
                              ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
