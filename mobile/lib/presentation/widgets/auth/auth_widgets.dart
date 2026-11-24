import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';

/// Port des composants d'authentification de karaavel
/// (`features/auth/presentation/widgets/auth_widgets.dart`) : même structure
/// visuelle (fond dégradé, carte centrée, champs, bouton pilule, séparateur,
/// mention légale), adaptée à camaircost (pas de go_router/l10n/logo image —
/// l'app n'a pas encore ces dépendances/assets ; boutons sociaux et
/// confirmation par email volontairement omis, camaircost n'a ni OAuth ni
/// vérification email côté backend).
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final isCompact = size.width < 520;

    return Scaffold(
      backgroundColor: context.backgroundColor,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: context.isDark
                ? const [
                    Color(0xFF0E0D12),
                    Color(0xFF17151C),
                    Color(0xFF221F29),
                  ]
                : const [
                    Color(0xFFF8F8FA),
                    Color(0xFFF1F0F4),
                    Color(0xFFE7E5EA),
                  ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                isCompact ? AppSpacing.lg : AppSpacing.xxl,
                isCompact ? AppSpacing.lg : AppSpacing.xxl,
                isCompact ? AppSpacing.lg : AppSpacing.xxl,
                AppSpacing.xxl,
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 430),
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AuthCard extends StatelessWidget {
  const AuthCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(22, 24, 22, 24),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: context.borderColor.withValues(alpha: 0.65)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: context.isDark ? 0.32 : 0.13),
            blurRadius: 28,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: child,
    );
  }
}

class AuthTopBar extends StatelessWidget {
  const AuthTopBar({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            child: const Icon(
              Icons.description_outlined,
              color: Colors.white,
              size: 19,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(t('auth_app_nom'), style: theme.textTheme.titleLarge),
          const SizedBox(height: 2),
          Text(t('auth_app_accroche'), style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class AuthTitle extends StatelessWidget {
  const AuthTitle({
    super.key,
    required this.title,
    required this.prompt,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String prompt;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.headlineLarge),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text('$prompt ', style: theme.textTheme.bodyMedium),
            InkWell(
              onTap: onAction,
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Text(
                  actionLabel,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class AuthPrimaryButton extends StatelessWidget {
  const AuthPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;

    return SizedBox(
      height: 46,
      width: double.infinity,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: isDark ? AppColors.white : AppColors.black,
          foregroundColor: isDark ? AppColors.neutral900 : AppColors.white,
          disabledBackgroundColor: context.textMuted.withValues(alpha: 0.28),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        child: isLoading
            ? SizedBox(
                width: 21,
                height: 21,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  color: isDark ? AppColors.neutral900 : AppColors.white,
                ),
              )
            : Text(label),
      ),
    );
  }
}

class AuthDivider extends StatelessWidget {
  const AuthDivider({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(child: Divider(color: context.borderColor)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: Text(
            label ?? AppStrings.of(context).t('auth_ou'),
            style: theme.textTheme.bodyMedium,
          ),
        ),
        Expanded(child: Divider(color: context.borderColor)),
      ],
    );
  }
}

class AuthLegalNotice extends StatelessWidget {
  const AuthLegalNotice({
    super.key,
    required this.termsTap,
    required this.privacyTap,
    this.textAlign = TextAlign.center,
  });

  final VoidCallback termsTap;
  final VoidCallback privacyTap;
  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final mutedStyle = theme.textTheme.bodySmall?.copyWith(height: 1.45);
    final linkStyle = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.primary,
      fontWeight: FontWeight.w700,
      height: 1.45,
    );

    return Text.rich(
      TextSpan(
        text: t('auth_legal_intro'),
        style: mutedStyle,
        children: [
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: InkWell(
              onTap: termsTap,
              borderRadius: BorderRadius.circular(4),
              child: Text(t('auth_legal_cgu'), style: linkStyle),
            ),
          ),
          TextSpan(text: t('auth_legal_et'), style: mutedStyle),
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: InkWell(
              onTap: privacyTap,
              borderRadius: BorderRadius.circular(4),
              child: Text(t('auth_legal_confidentialite'), style: linkStyle),
            ),
          ),
          const TextSpan(text: '.'),
        ],
      ),
      textAlign: textAlign,
    );
  }
}

class CommunityInput extends StatelessWidget {
  const CommunityInput({
    super.key,
    required this.controller,
    required this.label,
    required this.icon,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.suffix,
    this.enabled = true,
    this.validator,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscureText;
  final TextInputType keyboardType;
  final Widget? suffix;
  final bool enabled;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      enabled: enabled,
      validator: validator,
      style: theme.textTheme.bodyLarge,
      decoration: InputDecoration(
        hintText: label,
        prefixIcon: Icon(icon, size: 18, color: context.textMuted),
        suffixIcon: suffix,
      ),
    );
  }
}
