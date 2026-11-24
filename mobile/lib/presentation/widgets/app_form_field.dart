import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Champ de formulaire standard (label + TextFormField) réutilisé par tous
/// les écrans d'édition (profil, mot de passe, documents, formulaire de
/// constat...). Accepte soit un [controller] géré par l'appelant, soit
/// [initialValue] + [onChanged] pour les formulaires qui reconstruisent leur
/// état à chaque frappe (pattern déjà utilisé par `formulaire_screen.dart`).
class AppFormField extends StatelessWidget {
  const AppFormField({
    super.key,
    required this.label,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.hint,
    this.icon,
    this.keyboardType,
    this.obscureText = false,
    this.enabled = true,
    this.validator,
  }) : assert(
         controller == null || initialValue == null,
         'Fournir soit controller, soit initialValue — pas les deux.',
       );

  final String label;
  final TextEditingController? controller;
  final String? initialValue;
  final ValueChanged<String>? onChanged;
  final String? hint;
  final IconData? icon;
  final TextInputType? keyboardType;
  final bool obscureText;
  final bool enabled;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelLarge),
        const SizedBox(height: AppSpacing.xs),
        TextFormField(
          controller: controller,
          initialValue: controller == null ? initialValue : null,
          onChanged: onChanged,
          keyboardType: keyboardType,
          obscureText: obscureText,
          enabled: enabled,
          style: theme.textTheme.bodyLarge,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: icon == null ? null : Icon(icon, size: 20),
          ),
          validator: validator,
        ),
      ],
    );
  }
}
