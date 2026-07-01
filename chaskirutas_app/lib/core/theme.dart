import 'package:flutter/material.dart';

class ChaskiTheme {
  // Brand colors
  static const Color primary = Color(0xFFFF8C00); // Premium Amber/Orange
  static const Color secondary = Color(0xFF6366F1); // Sleek Indigo
  static const Color background = Color(0xFF0F172A); // Dark Slate background
  static const Color cardColor = Color(0xFF1E293B); // Dark slate card
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color accent = Color(0xFF10B981); // Emerald green for success/active

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: primary,
      scaffoldBackgroundColor: background,
      cardColor: cardColor,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        background: background,
        surface: cardColor,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onBackground: textPrimary,
        onSurface: textPrimary,
      ),
      fontFamily: 'Roboto', // Default fallback, Outfit can be added later
      textTheme: const TextTheme(
        headlineMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.bold, fontSize: 24),
        titleLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.bold, fontSize: 20),
        bodyLarge: TextStyle(color: textPrimary, fontSize: 16),
        bodyMedium: TextStyle(color: textSecondary, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      cardTheme: CardThemeData(
        color: cardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        elevation: 8,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1E293B),
        hintStyle: const TextStyle(color: textSecondary),
        labelStyle: const TextStyle(color: primary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF334155), width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
      ),
    );
  }

  // Common UI styles
  static BoxDecoration get glassDecoration => BoxDecoration(
    color: cardColor.withOpacity(0.85),
    borderRadius: BorderRadius.circular(24),
    border: Border.all(color: const Color(0xFF334155), width: 1.5),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.4),
        blurRadius: 15,
        offset: const Offset(0, 8),
      )
    ],
  );
}
