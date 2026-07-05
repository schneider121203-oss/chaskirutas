import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme.dart';
import 'features/splash/splash_view.dart';

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
    return MaterialApp(
      title: 'ChaskiRutas',
      debugShowCheckedModeBanner: false,
      theme: ChaskiTheme.darkTheme,
      // SplashScreen handles auth check and routes to the correct shell
      home: const SplashView(),
    );
  }
}
