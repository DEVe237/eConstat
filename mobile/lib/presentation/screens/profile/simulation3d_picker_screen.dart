import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../state/api_providers.dart';
import '../simulation3d/simulation3d_screen.dart';

/// Liste tous les constats déjà faits pour en choisir un et lancer
/// directement sa reconstitution 3D — point d'entrée alternatif à
/// Historique > détail > reconstitution 3D.
class Simulation3dPickerScreen extends ConsumerWidget {
  const Simulation3dPickerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final dossiersAsync = ref.watch(historiqueProvider);

    return Scaffold(
      appBar: AppBar(title: Text(t('sim3d_titre'))),
      body: SafeArea(
        child: dossiersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => Center(
            child: Text(t('sim3d_erreur'), style: theme.textTheme.bodyMedium),
          ),
          data: (dossiers) {
            if (dossiers.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.xxl),
                  child: Text(
                    t('sim3d_vide'),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.page),
              itemCount: dossiers.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final dossier = dossiers[index];
                final id = dossier['id'] as String;
                final vehicules =
                    (dossier['vehiculesImpliques'] as List?) ?? [];
                final plaque = vehicules.isNotEmpty
                    ? (vehicules.first as Map)['plaque'] as String? ?? '—'
                    : '—';

                return Material(
                  color: context.cardColor,
                  clipBehavior: Clip.antiAlias,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.xl),
                    side: BorderSide(color: context.borderColor),
                  ),
                  child: ListTile(
                    leading: Icon(
                      Icons.view_in_ar_outlined,
                      color: theme.colorScheme.primary,
                    ),
                    title: Text(
                      '${t('dossier_numero')} ${id.substring(0, 8).toUpperCase()}',
                    ),
                    subtitle: Text(
                      t('sim3d_plaque').replaceFirst('%s', plaque),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.pushNamed(
                      context,
                      AppRoutes.simulation3d,
                      arguments: Simulation3dArgs(dossierId: id),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
