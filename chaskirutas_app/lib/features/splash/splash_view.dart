import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_provider.dart';
import '../passenger/passenger_shell.dart';
import '../driver/driver_shell.dart';
import '../auth/login_view.dart';
import '../../core/theme.dart';

class SplashView extends ConsumerStatefulWidget {
  const SplashView({super.key});

  @override
  ConsumerState<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends ConsumerState<SplashView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeAnim;
  late final Animation<double> _scaleAnim;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fadeAnim  = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _scaleAnim = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );
    _controller.forward();

    // Give Riverpod time to load the session then navigate
    Future.delayed(const Duration(milliseconds: 1600), () {
      if (mounted && !_navigated) _navigate();
    });
  }

  void _navigate() {
    if (_navigated) return;
    _navigated = true;

    final authState = ref.read(authProvider);
    if (!mounted) return;

    Widget destination;
    if (authState.accessToken != null && authState.userProfile != null) {
      destination = authState.userRole == 'CONDUCTOR'
          ? const DriverShell()
          : const PassengerShell();
    } else {
      destination = const LoginView();
    }

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => destination,
        transitionsBuilder: (_, anim, __, child) =>
            FadeTransition(opacity: anim, child: child),
        transitionDuration: const Duration(milliseconds: 500),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Listen for auth state changes (in case token loads faster than the timer)
    ref.listen<AuthState>(authProvider, (prev, next) {
      // Once profile is loaded (or confirmed absent) after token check, navigate
      if (!next.isLoading && prev?.isLoading == true) {
        _navigate();
      }
    });

    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      body: Container(
        decoration: const BoxDecoration(gradient: ChaskiTheme.backgroundGradient),
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: ScaleTransition(
              scale: _scaleAnim,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Logo glow container
                  Container(
                    width: 110,
                    height: 110,
                    decoration: BoxDecoration(
                      gradient: ChaskiTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: ChaskiTheme.primaryGlow,
                    ),
                    child: const Icon(
                      Icons.directions_car_rounded,
                      size: 58,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'ChaskiRutas',
                    style: TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      color: ChaskiTheme.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'El camino formal y seguro',
                    style: TextStyle(
                      fontSize: 15,
                      color: ChaskiTheme.textSecondary,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 64),
                  SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        ChaskiTheme.primary.withOpacity(0.7),
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
