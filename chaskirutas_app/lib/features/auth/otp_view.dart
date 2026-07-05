import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_provider.dart';
import '../passenger/passenger_shell.dart';
import '../driver/driver_shell.dart';
import '../../core/theme.dart';

class OtpView extends ConsumerStatefulWidget {
  final String phone;
  const OtpView({super.key, required this.phone});

  @override
  ConsumerState<OtpView> createState() => _OtpViewState();
}

class _OtpViewState extends ConsumerState<OtpView>
    with SingleTickerProviderStateMixin {
  // 4-box OTP
  final List<TextEditingController> _controllers =
      List.generate(4, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(4, (_) => FocusNode());

  late final AnimationController _animController;
  late final Animation<double> _fadeAnim;

  // Resend countdown
  int _countdown = 60;
  Timer? _countdownTimer;
  bool _canResend = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _animController.forward();
    _startCountdown();
  }

  void _startCountdown() {
    setState(() {
      _countdown = 60;
      _canResend = false;
    });
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _countdown--;
        if (_countdown <= 0) {
          _canResend = true;
          t.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    for (final c in _controllers) { c.dispose(); }
    for (final f in _focusNodes) { f.dispose(); }
    _countdownTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  String get _fullCode =>
      _controllers.map((c) => c.text).join();

  Future<void> _verify() async {
    final code = _fullCode;
    if (code.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Ingresa los 4 dígitos del código'),
          backgroundColor: ChaskiTheme.danger,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final success = await ref.read(authProvider.notifier).verifyOtp(widget.phone, code);

    if (mounted) {
      if (success) {
        final authState = ref.read(authProvider);
        final destination = authState.userRole == 'CONDUCTOR'
            ? const DriverShell()
            : const PassengerShell();
        
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => destination),
          (route) => false,
        );
      } else {
        final err = ref.read(authProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err ?? 'Código inválido'),
            backgroundColor: ChaskiTheme.danger,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        // Clear boxes on error
        for (final c in _controllers) { c.clear(); }
        _focusNodes[0].requestFocus();
      }
    }
  }

  void _onDigitChanged(String value, int index) {
    if (value.length == 1 && index < 3) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    // Auto-verify when all 4 filled
    if (_fullCode.length == 4) {
      Future.delayed(const Duration(milliseconds: 100), _verify);
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: ChaskiTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(gradient: ChaskiTheme.backgroundGradient),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),

                  // ── Header ────────────────────────────────────────────────
                  Center(
                    child: Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: ChaskiTheme.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: ChaskiTheme.primary.withOpacity(0.4),
                          width: 1.5,
                        ),
                      ),
                      child: const Icon(
                        Icons.sms_rounded,
                        size: 34,
                        color: ChaskiTheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Verificar número',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: ChaskiTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Código enviado al\n${widget.phone}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      color: ChaskiTheme.textSecondary,
                      height: 1.5,
                    ),
                  ),

                  const SizedBox(height: 48),

                  // ── 4-box OTP input ──────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(4, (i) {
                      final isFilled = _controllers[i].text.isNotEmpty;
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: SizedBox(
                          width: 64,
                          height: 72,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            decoration: BoxDecoration(
                              color: ChaskiTheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isFilled
                                    ? ChaskiTheme.primary
                                    : ChaskiTheme.border,
                                width: isFilled ? 2 : 1.5,
                              ),
                              boxShadow: isFilled ? ChaskiTheme.primaryGlow : null,
                            ),
                            child: TextField(
                              controller: _controllers[i],
                              focusNode: _focusNodes[i],
                              keyboardType: TextInputType.number,
                              textAlign: TextAlign.center,
                              maxLength: 1,
                              style: const TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w800,
                                color: ChaskiTheme.primary,
                              ),
                              decoration: const InputDecoration(
                                counterText: '',
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                fillColor: Colors.transparent,
                              ),
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                              ],
                              onChanged: (v) => _onDigitChanged(v, i),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),

                  const SizedBox(height: 40),

                  // ── Verify button ─────────────────────────────────────────
                  GestureDetector(
                    onTap: state.isLoading ? null : _verify,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: _fullCode.length == 4 && !state.isLoading
                            ? ChaskiTheme.primaryGradient
                            : const LinearGradient(colors: [Color(0xFF253047), Color(0xFF253047)]),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: _fullCode.length == 4 && !state.isLoading
                            ? ChaskiTheme.primaryGlow
                            : null,
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
                                'Verificar y Continuar',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 16,
                                ),
                              ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // ── Resend ────────────────────────────────────────────────
                  Center(
                    child: _canResend
                        ? GestureDetector(
                            onTap: () {
                              ref.read(authProvider.notifier).sendOtp(widget.phone);
                              _startCountdown();
                            },
                            child: const Text(
                              'Reenviar código',
                              style: TextStyle(
                                color: ChaskiTheme.primary,
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                          )
                        : Text(
                            'Reenviar en $_countdown segundos',
                            style: const TextStyle(
                              color: ChaskiTheme.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
