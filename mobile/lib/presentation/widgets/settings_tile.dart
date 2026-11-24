import 'package:flutter/material.dart';

import '../../core/theme/theme_extension.dart';

/// Ligne de liste standard pour les écrans profil/paramètres : icône, titre,
/// sous-titre optionnel, chevron. Remplace `_ActionTile`/`_QuickActionCard`/
/// `_InfoLine`, trois variantes bespoke d'une même idée.
///
/// Style calqué exactement sur `_Tile` de karaavel : ligne plate (pas de
/// carte/boîte autour), icône simple colorée par la marque, sans conteneur —
/// les sections profil/paramètres de karaavel n'enveloppent jamais leurs
/// lignes dans une carte, seul le libellé de section les regroupe visuellement.
class SettingsTile extends StatelessWidget {
  const SettingsTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailingText,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final String? trailingText;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
      dense: true,
      minLeadingWidth: 0,
      leading: Icon(icon, size: 21, color: theme.colorScheme.primary),
      title: Text(title, style: theme.textTheme.bodyLarge),
      subtitle: subtitle == null
          ? null
          : Text(subtitle!, style: theme.textTheme.bodySmall),
      trailing: trailingText != null
          ? Text(trailingText!, style: theme.textTheme.bodyMedium)
          : (onTap != null
                ? Icon(Icons.chevron_right, size: 18, color: context.textMuted)
                : null),
    );
  }
}

/// Variante `SwitchListTile` de [SettingsTile], même habillage plat.
class SettingsSwitchTile extends StatelessWidget {
  const SettingsSwitchTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SwitchListTile(
      value: value,
      onChanged: onChanged,
      contentPadding: EdgeInsets.zero,
      dense: true,
      secondary: Icon(icon, size: 21, color: theme.colorScheme.primary),
      title: Text(title, style: theme.textTheme.bodyLarge),
      subtitle: subtitle == null
          ? null
          : Text(subtitle!, style: theme.textTheme.bodySmall),
    );
  }
}
