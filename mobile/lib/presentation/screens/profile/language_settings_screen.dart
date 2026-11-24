import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../state/language_provider.dart';

class _Langue {
  const _Langue(this.drapeau, this.nom, this.disponible);

  final String drapeau;
  final String nom;
  final bool disponible;
}

const _langues = [
  _Langue('🇫🇷', 'Français', true),
  _Langue('🇬🇧', 'English', true),
];

/// Feuille de sélection de langue — ouverte en `showModalBottomSheet`, même
/// comportement que [ThemePreferenceSheet] (drag handle, liste avec coche
/// sur la sélection courante) plutôt qu'une page à part entière. Français et
/// anglais sont tous deux réellement traduits (voir `AppStrings`) ; la liste
/// garde un statut "disponible" par langue pour pouvoir en ajouter d'autres
/// plus tard sans prétendre qu'elles marchent avant d'avoir traduit l'app.
class LanguagePreferenceSheet extends ConsumerWidget {
  const LanguagePreferenceSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selection = ref.watch(languageProvider);
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          0,
          AppSpacing.lg,
          AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 0, 4, AppSpacing.sm),
              child: Text(
                t('langue_choisir'),
                style: theme.textTheme.titleLarge,
              ),
            ),
            for (final langue in _langues)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Text(
                  langue.drapeau,
                  style: const TextStyle(fontSize: 24),
                ),
                title: Text(langue.nom),
                subtitle: langue.disponible ? null : Text(t('langue_bientot')),
                trailing: langue.nom == selection
                    ? Icon(Icons.check, color: theme.colorScheme.primary)
                    : null,
                onTap: () {
                  if (!langue.disponible) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${langue.nom}: ${t('langue_bientot')}'),
                      ),
                    );
                    return;
                  }
                  ref.read(languageProvider.notifier).definir(langue.nom);
                  Navigator.pop(context);
                },
              ),
          ],
        ),
      ),
    );
  }
}
