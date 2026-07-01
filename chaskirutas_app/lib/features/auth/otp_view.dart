import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';

class OtpView extends ConsumerStatefulWidget {
  final String phone;

  const OtpView({super.key, required this.phone});

  @override
  ConsumerState<OtpView> createState() => _OtpViewState();
}

class _OtpViewState extends ConsumerState<OtpView> {
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (!_formKey.currentState!.validate()) return;

    final code = _codeController.text.trim();
    final success = await ref.read(authProvider.notifier).verifyOtp(widget.phone, code);
    
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Inicio de sesión exitoso!'),
            backgroundColor: Colors.green,
          ),
        );
        // Pop back to the initial landing screen which now automatically routes to Home because state.accessToken is set.
        Navigator.popUntil(context, (route) => route.isFirst);
      } else {
        final err = ref.read(authProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err ?? 'Código inválido'),
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
        title: const Text('Verificar Código'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Código enviado al \n${widget.phone}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              const Text(
                'Ingresa el código OTP de 4 o 6 dígitos que te enviamos por mensaje de texto para confirmar tu identidad.',
                style: TextStyle(fontSize: 14, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 36),
              Form(
                key: _formKey,
                child: TextFormField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, letterSpacing: 8, color: Colors.white, fontWeight: FontWeight.bold),
                  decoration: const InputDecoration(
                    hintText: '••••',
                    prefixIcon: Icon(Icons.lock_outline_rounded, color: Colors.grey),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Ingresa el código';
                    if (val.length < 4 || val.length > 6) return 'Debe ser de 4 a 6 dígitos';
                    return null;
                  },
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: state.isLoading ? null : _verify,
                child: state.isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Verificar y Continuar'),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () {
                  ref.read(authProvider.notifier).sendOtp(widget.phone);
                },
                child: const Text('¿No recibiste el código? Reenviar'),
              )
            ],
          ),
        ),
      ),
    );
  }
}
