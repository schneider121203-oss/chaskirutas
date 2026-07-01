import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import 'otp_view.dart';
import 'register_view.dart';

class LoginView extends ConsumerStatefulWidget {
  const LoginView({super.key});

  @override
  ConsumerState<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends ConsumerState<LoginView> {
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    if (!_formKey.currentState!.validate()) return;
    
    final phone = _phoneController.text.trim();
    final res = await ref.read(authProvider.notifier).sendOtp(phone);
    
    if (mounted) {
      if (res != null) {
        // En desarrollo/dev: el backend puede retornar devCode: '1234'
        final String? devCode = res['devCode'];
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('OTP Enviado. ${devCode != null ? 'Código de prueba: $devCode' : ''}'),
            backgroundColor: Theme.of(context).primaryColor,
          ),
        );
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OtpView(phone: phone),
          ),
        );
      } else {
        final err = ref.read(authProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err ?? 'Error al enviar código OTP'),
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
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo/Splash Mock
              const Icon(
                Icons.directions_car_rounded,
                size: 80,
                color: Color(0xFFFF8C00),
              ),
              const SizedBox(height: 16),
              const Text(
                'ChaskiRutas',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'El camino formal y seguro',
                style: TextStyle(fontSize: 16, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              Form(
                key: _formKey,
                child: TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: Colors.white, fontSize: 18),
                  decoration: const InputDecoration(
                    labelText: 'Número de Celular',
                    hintText: '+51987654321',
                    prefixIcon: Icon(Icons.phone_iphone_rounded, color: Colors.grey),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Ingresa tu número';
                    if (!val.startsWith('+51') || val.length != 12) {
                      return 'Formato requerido: +51XXXXXXXXX';
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: state.isLoading ? null : _requestOtp,
                child: state.isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Enviar Código de Acceso'),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const RegisterView()),
                  );
                },
                child: RichText(
                  text: TextSpan(
                    text: '¿No tienes cuenta? ',
                    style: const TextStyle(color: Colors.grey),
                    children: [
                      TextSpan(
                        text: 'Registrate aquí',
                        style: TextStyle(
                          color: Theme.of(context).primaryColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
