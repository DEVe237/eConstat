import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Port direct de l'extension `BuildContext` de karaavel
/// (`app/theme/theme_extension.dart`) : contrairement aux couleurs `static
/// const` d'[AppTheme], ces accesseurs suivent la luminosité effective
/// (claire/sombre) au moment du build.
extension ThemeColorsContextExtension on BuildContext {
  bool get isDark => Theme.of(this).brightness == Brightness.dark;
  ColorScheme get _scheme => Theme.of(this).colorScheme;

  // ─── Surfaces ────────────────────────────────────────────────────────────
  Color get surfaceColor => _scheme.surface;
  Color get backgroundColor => Theme.of(this).scaffoldBackgroundColor;
  Color get elevatedSurfaceColor => _scheme.surfaceContainer;
  Color get cardColor => _scheme.surfaceContainer;

  // ─── Texte ───────────────────────────────────────────────────────────────
  Color get textPrimary => _scheme.onSurface;
  Color get textMuted => isDark ? const Color(0xFFA6A3B2) : AppColors.neutral500;
  Color get textSecondary => isDark ? const Color(0xFFC8C5D0) : AppColors.neutral600;

  // ─── Bordures & champs ───────────────────────────────────────────────────
  Color get borderColor => _scheme.outline;
  Color get inputFillColor => isDark ? const Color(0xFF202027) : AppColors.neutral100;
  Color get inputTextColor => _scheme.onSurface;
  Color get hintColor => isDark ? const Color(0xFF85818F) : AppColors.neutral400;

  Color get iconColor => isDark ? const Color(0xFFC8C5D0) : AppColors.neutral600;
}
