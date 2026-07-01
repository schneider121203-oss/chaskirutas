import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme.dart';
import 'features/auth/auth_provider.dart';
import 'features/auth/login_view.dart';
import 'features/dashboard_switch.dart';

void main() {
  runApp(
    const ProviderScope(
      child: ChaskiRutasApp(),
    ),
  );
}

class ChaskiRutasApp extends ConsumerWidget {
  const ChaskiRutasApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'ChaskiRutas',
      debugShowCheckedModeBanner: false,
      theme: ChaskiTheme.darkTheme,
      // Dynamic Root selection: If authenticated, render DashboardSwitch (drawer + screens)
      // otherwise fallback to LoginView (phone + OTP).
      home: authState.accessToken != null
          ? const DashboardSwitch()
          : const LoginView(),
    );
  }
}
