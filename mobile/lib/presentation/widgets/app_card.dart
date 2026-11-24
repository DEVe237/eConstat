import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_extension.dart';

/// Carte générique unique de l'app : remplace les multiples implémentations
/// bespoke (`_StatCard`, `_InfoGroup`, `_DocumentCard`, `_CardBox`...) qui
/// avaient chacune leur propre rayon/bordure/ombre. Un seul point de réglage
/// pour que toutes les "cartes" de l'app se lisent comme un seul système.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.borderRadius = AppRadius.xxl,
    this.showBorder = true,
    this.showShadow = false,
    this.color,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final bool showBorder;
  final bool showShadow;
  final Color? color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final resolvedColor = color ?? context.cardColor;
    final radius = BorderRadius.circular(borderRadius);
    final decoration = BoxDecoration(
      color: resolvedColor,
      borderRadius: radius,
      border: showBorder
          ? Border.all(color: context.borderColor, width: 1.2)
          : null,
      boxShadow: showShadow
          ? [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ]
          : null,
    );

    if (onTap == null) {
      return Container(padding: padding, decoration: decoration, child: child);
    }

    return Material(
      color: resolvedColor,
      borderRadius: radius,
      child: InkWell(
        borderRadius: radius,
        onTap: onTap,
        child: Container(
          padding: padding,
          decoration: decoration.copyWith(color: Colors.transparent),
          child: child,
        ),
      ),
    );
  }
}
