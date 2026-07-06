import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ChaskiTheme {
  // ── Brand Palette ──────────────────────────────────────────────────────────
  static const Color primary   = Color(0xFFFF8C00); // Amber/Orange
  static const Color secondary = Color(0xFF6366F1); // Indigo
  static const Color background= Color(0xFF0A0F1E); // Deep navy black
  static const Color surface   = Color(0xFF111827); // Card surface
  static const Color cardColor = Color(0xFF1A2235); // Card elevated
  static const Color border    = Color(0xFF253047); // Subtle border

  static const Color textPrimary   = Color(0xFFF1F5F9);
  static const Color textSecondary = Color(0xFF64748B);

  static const Color accent  = Color(0xFF10B981); // Emerald green
  static const Color success = Color(0xFF10B981); // Success (alias de accent)
  static const Color danger  = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);

  // ── Gradients ──────────────────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFFF8C00), Color(0xFFFF5722)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF0A0F1E), Color(0xFF111827), Color(0xFF0A0F1E)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient conductorGradient = LinearGradient(
    colors: [Color(0xFF4F46E5), Color(0xFF6366F1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ── Glow Shadows ──────────────────────────────────────────────────────────
  static List<BoxShadow> get primaryGlow => [
    BoxShadow(
      color: primary.withOpacity(0.45),
      blurRadius: 24,
      spreadRadius: 2,
      offset: const Offset(0, 6),
    ),
  ];

  static List<BoxShadow> get conductorGlow => [
    BoxShadow(
      color: secondary.withOpacity(0.45),
      blurRadius: 24,
      spreadRadius: 2,
      offset: const Offset(0, 6),
    ),
  ];

  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: Colors.black.withOpacity(0.5),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];

  // ── Decorations ────────────────────────────────────────────────────────────
  static BoxDecoration get glassDecoration => BoxDecoration(
    color: cardColor.withOpacity(0.88),
    borderRadius: BorderRadius.circular(24),
    border: Border.all(color: border, width: 1.5),
    boxShadow: cardShadow,
  );

  static BoxDecoration get glassDecorationStrong => BoxDecoration(
    color: surface.withOpacity(0.95),
    borderRadius: BorderRadius.circular(28),
    border: Border.all(color: primary.withOpacity(0.3), width: 1.5),
    boxShadow: primaryGlow,
  );

  static BoxDecoration gradientButton({double radius = 16}) => BoxDecoration(
    gradient: primaryGradient,
    borderRadius: BorderRadius.circular(radius),
    boxShadow: primaryGlow,
  );

  // ── Theme ──────────────────────────────────────────────────────────────────
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: primary,
      scaffoldBackgroundColor: background,
      cardColor: cardColor,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        surface: surface,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: textPrimary,
      ),
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
        ),
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
      textTheme: const TextTheme(
        displaySmall:  TextStyle(color: textPrimary, fontWeight: FontWeight.w800, fontSize: 32, letterSpacing: -0.5),
        headlineMedium:TextStyle(color: textPrimary, fontWeight: FontWeight.w700, fontSize: 26),
        titleLarge:    TextStyle(color: textPrimary, fontWeight: FontWeight.w700, fontSize: 20),
        titleMedium:   TextStyle(color: textPrimary, fontWeight: FontWeight.w600, fontSize: 16),
        bodyLarge:     TextStyle(color: textPrimary, fontSize: 16, height: 1.5),
        bodyMedium:    TextStyle(color: textSecondary, fontSize: 14, height: 1.5),
        labelLarge:    TextStyle(color: textPrimary, fontWeight: FontWeight.w700, fontSize: 15, letterSpacing: 0.3),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 28),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: 0.3),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: primary, width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 28),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      cardTheme: CardThemeData(
        color: cardColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: border, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        hintStyle: const TextStyle(color: textSecondary, fontSize: 15),
        labelStyle: const TextStyle(color: textSecondary, fontSize: 14),
        floatingLabelStyle: const TextStyle(color: primary, fontSize: 13, fontWeight: FontWeight.w600),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: border, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: border, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: danger, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: danger, width: 2),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: primary,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
        unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
      ),
      dividerTheme: const DividerThemeData(color: border, thickness: 1),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected) ? primary : textSecondary),
        trackColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected)
                ? primary.withOpacity(0.35)
                : border),
      ),
    );
  }
}
