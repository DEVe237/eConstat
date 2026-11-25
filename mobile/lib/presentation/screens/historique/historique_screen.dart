import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../state/api_providers.dart';
import 'dossier_detail_screen.dart';

class HistoriqueScreen extends ConsumerWidget {
  const HistoriqueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final dossiersAsync = ref.watch(historiqueProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(historiqueProvider.future),
          child: dossiersAsync.when(
            // Une relecture automatique ratée garde la liste affichée.
            skipError: true,
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => _EtatVide(
              icon: Icons.cloud_off_outlined,
              titre: t('historique_serveur_titre'),
              message: t('historique_serveur_message'),
            ),
            data: (dossiers) {
              if (dossiers.isEmpty) {
                return _EtatVide(
                  icon: Icons.folder_open_outlined,
                  titre: t('historique_vide_titre'),
                  message: t('historique_vide_message'),
                );
              }

              final items = dossiers
                  .map((d) {
                    final statut = d['statut'] as String? ?? 'brouillon';
                    final etiquette = etiquetteStatut(statut, d['enTraitement'] == true);
                    final vehicules = (d['vehiculesImpliques'] as List?) ?? [];
                    final premierePlaque = vehicules.isNotEmpty
                        ? (vehicules.first as Map)['plaque'] as String? ?? '—'
                        : '—';
                    final dateCreation = (d['dateCreation'] as String? ?? '')
                        .split('T');
                    final dateAffichee = dateCreation.length == 2
                        ? '${dateCreation[0]} • ${dateCreation[1].substring(0, 5)}'
                        : '';

                    return DossierDetailArgs(
                      dossierId: d['id'] as String,
                      titre:
                          '${t('dossier_numero')} ${(d['id'] as String).substring(0, 8).toUpperCase()}',
                      date: dateAffichee,
                      statut: t(etiquette.$1),
                      statutColor: etiquette.$2,
                      plaque: premierePlaque,
                    );
                  })
                  .toList(growable: false);

              return ListView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.page,
                  AppSpacing.xl,
                  AppSpacing.page,
                  AppSpacing.xxl,
                ),
                children: [
                  Text(
                    t('historique_titre'),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineLarge,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Material(
                    color: context.cardColor,
                    clipBehavior: Clip.antiAlias,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.xxl),
                      side: BorderSide(color: context.borderColor),
                    ),
                    child: Column(
                      children: [
                        for (var i = 0; i < items.length; i++) ...[
                          _LigneDossier(args: items[i]),
                          if (i != items.length - 1)
                            Divider(
                              height: 1,
                              color: context.borderColor,
                              indent: AppSpacing.md,
                              endIndent: AppSpacing.md,
                            ),
                        ],
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _LigneDossier extends StatelessWidget {
  const _LigneDossier({required this.args});

  final DossierDetailArgs args;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => DossierDetailScreen(args: args)),
      ),
      leading: Icon(Icons.directions_car, color: theme.colorScheme.primary),
      title: Text(args.titre, style: theme.textTheme.titleSmall),
      subtitle: Text(
        '${args.date} • Plaque ${args.plaque}',
        style: theme.textTheme.bodySmall,
      ),
      trailing: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: 4,
        ),
        decoration: BoxDecoration(
          color: args.statutColor,
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
        child: Text(
          args.statut,
          style: theme.textTheme.labelSmall?.copyWith(color: Colors.white),
        ),
      ),
    );
  }
}

class _EtatVide extends StatelessWidget {
  const _EtatVide({
    required this.icon,
    required this.titre,
    required this.message,
  });

  final IconData icon;
  final String titre;
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xxl),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: context.elevatedSurfaceColor,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, size: 34, color: context.textMuted),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(titre, style: theme.textTheme.titleMedium),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
