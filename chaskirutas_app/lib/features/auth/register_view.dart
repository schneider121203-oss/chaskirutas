import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';

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
          const SnackBar(
            content: Text('¡Registro exitoso! Por favor inicia sesión.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      } else {
        final error = ref.read(authProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Error al registrarse'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear Cuenta'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Únete a ChaskiRutas',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Formalizando el transporte peruano',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                // Role Selector
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(
                        label: const Center(child: Text('Pasajero')),
                        selected: _selectedRole == 'PASAJERO',
                        selectedColor: Theme.of(context).primaryColor,
                        onSelected: (val) {
                          if (val) setState(() => _selectedRole = 'PASAJERO');
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ChoiceChip(
                        label: const Center(child: Text('Conductor')),
                        selected: _selectedRole == 'CONDUCTOR',
                        selectedColor: Theme.of(context).primaryColor,
                        onSelected: (val) {
                          if (val) setState(() => _selectedRole = 'CONDUCTOR');
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Nombre Completo', hintText: 'Juan Pérez'),
                  validator: (val) => val == null || val.isEmpty ? 'Requerido' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Celular', hintText: '+51987654321'),
                  validator: (val) => val == null || !val.startsWith('+51') || val.length != 12
                      ? 'Debe tener formato +51XXXXXXXXX'
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _dniController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'DNI', hintText: '8 dígitos'),
                  validator: (val) => val == null || val.length != 8 ? 'DNI debe tener 8 dígitos' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Contraseña'),
                  validator: (val) => val == null || val.length < 6 ? 'Mínimo 6 caracteres' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Correo Electrónico (Opcional)'),
                ),
                if (_selectedRole == 'CONDUCTOR') ...[
                  const SizedBox(height: 24),
                  const Divider(color: Colors.grey),
                  const SizedBox(height: 8),
                  const Text(
                    'Datos de Brevete / Licencia',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _licenseNumberController,
                    decoration: const InputDecoration(labelText: 'Número de Licencia', hintText: 'Q12345678'),
                    validator: (val) => _selectedRole == 'CONDUCTOR' && (val == null || val.isEmpty)
                        ? 'Requerido para conductor'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _licenseClassController,
                    decoration: const InputDecoration(labelText: 'Clase/Categoría', hintText: 'A-IIa'),
                    validator: (val) => _selectedRole == 'CONDUCTOR' && (val == null || val.isEmpty)
                        ? 'Requerido para conductor'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _licenseExpiresController,
                    decoration: const InputDecoration(labelText: 'Fecha de Expiración', hintText: 'YYYY-MM-DD'),
                    validator: (val) => _selectedRole == 'CONDUCTOR' && (val == null || val.isEmpty)
                        ? 'Requerido para conductor'
                        : null,
                  ),
                ],
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: state.isLoading ? null : _submit,
                  child: state.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Registrarse'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
