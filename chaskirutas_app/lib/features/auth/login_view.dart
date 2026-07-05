import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import 'otp_view.dart';
import 'register_view.dart';
import '../../core/theme.dart';

class LoginView extends ConsumerStatefulWidget {
  const LoginView({super.key});

  @override
  ConsumerState<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends ConsumerState<LoginView>
    with SingleTickerProviderStateMixin {
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  late final AnimationController _animController;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _animController.forward();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    if (!_formKey.currentState!.validate()) return;

    final phone = _phoneController.text.trim();
    final res = await ref.read(authProvider.notifier).sendOtp(phone);

    if (mounted) {
      if (res != null) {
        final String? devCode = res['devCode'];
        if (devCode != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🔑 Código de prueba: $devCode'),
              backgroundColor: ChaskiTheme.accent,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
        }
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => OtpView(phone: phone)),
        );
      } else {
        final err = ref.read(authProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err ?? 'Error al enviar código OTP'),
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
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light,
        child: Container(
          decoration: const BoxDecoration(gradient: ChaskiTheme.backgroundGradient),
          child: SafeArea(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: size.height - 100),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(height: size.height * 0.1),

                      // ── Logo ────────────────────────────────────────────
                      Center(
                        child: Container(
                          width: 90,
                          height: 90,
                          decoration: BoxDecoration(
                            gradient: ChaskiTheme.primaryGradient,
                            borderRadius: BorderRadius.circular(26),
                            boxShadow: ChaskiTheme.primaryGlow,
                          ),
                          child: const Icon(
                            Icons.directions_car_rounded,
                            size: 48,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'ChaskiRutas',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.w800,
                          color: ChaskiTheme.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Transporte peruano formalizado',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: ChaskiTheme.textSecondary,
                          letterSpacing: 0.2,
                        ),
                      ),

                      SizedBox(height: size.height * 0.07),

                      // ── Form card ───────────────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: ChaskiTheme.glassDecoration,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Iniciar sesión',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                                color: ChaskiTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Ingresa tu número para recibir el código de acceso',
                              style: TextStyle(
                                fontSize: 13,
                                color: ChaskiTheme.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 24),
                            Form(
                              key: _formKey,
                              child: TextFormField(
                                controller: _phoneController,
                                keyboardType: TextInputType.phone,
                                style: const TextStyle(
                                  color: ChaskiTheme.textPrimary,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 1.5,
                                ),
                                decoration: InputDecoration(
                                  hintText: '+51 987 654 321',
                                  hintStyle: const TextStyle(
                                    color: ChaskiTheme.textSecondary,
                                    letterSpacing: 1,
                                  ),
                                  prefixIcon: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Text('🇵🇪', style: TextStyle(fontSize: 20)),
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 1,
                                          height: 22,
                                          color: ChaskiTheme.border,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) {
                                    return 'Ingresa tu número de celular';
                                  }
                                  if (!val.startsWith('+51') || val.length != 12) {
                                    return 'Formato: +51XXXXXXXXX (12 caracteres)';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(height: 20),

                            // ── Gradient button ─────────────────────────
                            GestureDetector(
                              onTap: state.isLoading ? null : _requestOtp,
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 150),
                                height: 56,
                                decoration: BoxDecoration(
                                  gradient: state.isLoading
                                      ? const LinearGradient(colors: [Color(0xFF334155), Color(0xFF334155)])
                                      : ChaskiTheme.primaryGradient,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: state.isLoading ? [] : ChaskiTheme.primaryGlow,
                                ),
                                child: Center(
                                  child: state.isLoading
                                      ? const SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                          ),
                                        )
                                      : const Text(
                                          'Enviar Código de Acceso',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 16,
                                            letterSpacing: 0.3,
                                          ),
                                        ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // ── Register link ────────────────────────────────────
                      Center(
                        child: GestureDetector(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const RegisterView()),
                          ),
                          child: RichText(
                            text: const TextSpan(
                              text: '¿No tienes cuenta? ',
                              style: TextStyle(color: ChaskiTheme.textSecondary, fontSize: 14),
                              children: [
                                TextSpan(
                                  text: 'Regístrate gratis',
                                  style: TextStyle(
                                    color: ChaskiTheme.primary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
