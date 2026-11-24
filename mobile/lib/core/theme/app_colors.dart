import 'package:flutter/material.dart';

/// Palette reprise à l'identique de karaavel (`app/theme/app_colors.dart`) —
/// mêmes valeurs, même structure, pour que camaircost partage le même
/// modèle de couleurs (marque violette + jaune, neutres, dégradés).
class AppColors {
  AppColors._();

  // ─── Marque ──────────────────────────────────────────────────────────────
  static const brandPrimary = Color(0xFF9C1BF2);
  static const brandSecondary = Color(0xFF6204BF);
  static const brandDark = Color(0xFF260259);
  static const brandAction = Color(0xFF2922F2);
  static const brandLight = Color(0xFFF2F2F2);

  // ─── Violet ──────────────────────────────────────────────────────────────
  static const violet900 = Color(0xFF4C1D95);
  static const violet800 = Color(0xFF5B21B6);
  static const violet700 = Color(0xFF6D28D9);
  static const violet600 = Color(0xFF7C3AED);
  static const violet500 = Color(0xFF8B5CF6);
  static const violet400 = Color(0xFFA78BFA);
  static const violet300 = Color(0xFFC4B5FD);
  static const violet200 = Color(0xFFDDD6FE);
  static const violet100 = Color(0xFFEDE9FE);
  static const violet50 = Color(0xFFF5F3FF);

  static const premiumViolet = violet600;

  // ─── Jaune ───────────────────────────────────────────────────────────────
  static const yellow500 = Color(0xFFEAB308);
  static const yellow400 = Color(0xFFFACC15);
  static const yellow300 = Color(0xFFFDE047);
  static const yellow200 = Color(0xFFFEF08A);
  static const yellow100 = Color(0xFFFEF9C3);
  static const brightGold = yellow400;

  // ─── Neutres ─────────────────────────────────────────────────────────────
  static const neutral900 = Color(0xFF18181B);
  static const neutral800 = Color(0xFF27272A);
  static const neutral700 = Color(0xFF3F3F46);
  static const neutral600 = Color(0xFF52525B);
  static const neutral500 = Color(0xFF71717A);
  static const neutral400 = Color(0xFFA1A1AA);
  static const neutral300 = Color(0xFFD4D4D8);
  static const neutral200 = Color(0xFFE4E4E7);
  static const neutral100 = Color(0xFFF4F4F5);
  static const neutral50 = Color(0xFFFAFAFA);

  // ─── Alias sémantiques ───────────────────────────────────────────────────
  static const textPrimary = neutral900;
  static const textMuted = neutral500;
  static const textSecondary = neutral400;
  static const border = neutral200;
  static const inputFill = neutral100;

  // ─── Surfaces ────────────────────────────────────────────────────────────
  static const white = Color(0xFFFFFFFF);
  static const black = Color(0xFF000000);
  static const background = white;
  static const surface = white;
  static const muted = Color(0xFFECECF0);
  static const accent = Color(0xFFE9EBEF);

  // ─── Système ─────────────────────────────────────────────────────────────
  static const primary = Color(0xFF030213);
  static const primaryForeground = white;
  static const secondary = Color(0xFFF0EEFA);
  static const destructive = Color(0xFFD4183D);
  static const success = Color(0xFF22C55E);
  static const alert = Color(0xFFEF4444);
  static const info = Color(0xFF3B82F6);

  // ─── Dégradés ────────────────────────────────────────────────────────────
  static const brandGradient = [violet600, violet700, violet800];
  static const authGradient = [violet700, violet600, violet500];
  static const buttonGradient = [violet700, violet600];
  static const goldGradient = [yellow400, yellow500];

  static const imageOverlay = [
    Colors.transparent,
    Color(0x66000000),
    Color(0xB3000000),
  ];
  static const imageOverlayStops = [0.0, 0.4, 1.0];

  static const brandShadow = Color(0x338B5CF6);
}
