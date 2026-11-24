import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../simulation3d/simulation3d_screen.dart';

class DossierDetailArgs {
  const DossierDetailArgs({
    required this.dossierId,
    required this.titre,
    required this.date,
    required this.statut,
    required this.statutColor,
    required this.plaque,
  });

  final String dossierId;
  final String titre;
  final String date;
  final String statut;
  final Color statutColor;
  final String plaque;
}

/// Détail d'un dossier depuis l'historique — lecture seule, avec un accès
/// direct à sa reconstitution 3D.
class DossierDetailScreen extends StatelessWidget {
  const DossierDetailScreen({super.key, required this.args});

  final DossierDetailArgs args;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Scaffold(
      appBar: AppBar(title: Text(args.titre)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.page),
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(AppRadius.xxl),
                border: Border.all(color: context.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          t('dossier_statut'),
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                      Container(
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
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: AppSpacing.xl),
                  _Ligne(t('dossier_date'), args.date),
                  const SizedBox(height: AppSpacing.sm),
                  _Ligne(t('dossier_plaque'), args.plaque),
                  const SizedBox(height: AppSpacing.sm),
                  _Ligne(
                    t('dossier_numero'),
                    '#${args.dossierId.substring(0, 8).toUpperCase()}',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(46),
              ),
              onPressed: () => Navigator.pushNamed(
                context,
                AppRoutes.simulation3d,
                arguments: Simulation3dArgs(dossierId: args.dossierId),
              ),
              icon: const Icon(Icons.view_in_ar_outlined, size: 20),
              label: Text(t('dossier_voir_3d')),
            ),
          ],
        ),
      ),
    );
  }
}

class _Ligne extends StatelessWidget {
  const _Ligne(this.label, this.valeur);

  final String label;
  final String valeur;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
        Flexible(
          child: Text(
            valeur,
            style: theme.textTheme.titleSmall,
            textAlign: TextAlign.right,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
