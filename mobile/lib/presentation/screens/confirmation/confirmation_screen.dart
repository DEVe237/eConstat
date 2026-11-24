import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../recapitulatif/recapitulatif_screen.dart';
import '../simulation3d/simulation3d_screen.dart';

class ConfirmationArgs {
  const ConfirmationArgs({
    required this.numeroDossier,
    required this.transmisAuServeur,
    this.dossierId,
  });

  final String numeroDossier;
  final bool transmisAuServeur;

  /// Identifiant réel du dossier (pas le numéro court affiché à l'écran),
  /// nécessaire pour ouvrir la reconstitution 3D de ce dossier précis.
  final String? dossierId;
}

class ConfirmationScreen extends StatelessWidget {
  const ConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final args =
        ModalRoute.of(context)!.settings.arguments as ConfirmationArgs?;
    final numeroDossier = args?.numeroDossier ?? '—';
    final transmis = args?.transmisAuServeur ?? false;
    final dossierId = args?.dossierId;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.page,
            AppSpacing.lg,
            AppSpacing.page,
            AppSpacing.xxl,
          ),
          children: [
            Center(
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(
                    alpha: context.isDark ? 0.22 : 0.14,
                  ),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      size: 38,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              t('confirmation_succes'),
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineLarge,
            ),
            const SizedBox(height: AppSpacing.lg),
            Container(
              padding: const EdgeInsets.symmetric(
                vertical: AppSpacing.lg,
                horizontal: AppSpacing.lg,
              ),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(AppRadius.xxl),
                border: Border.all(color: context.borderColor),
              ),
              child: Column(
                children: [
                  Text(
                    t('confirmation_numero_dossier'),
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text('#$numeroDossier', style: theme.textTheme.displayMedium),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              t('confirmation_message'),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.xl),
            if (dossierId != null) ...[
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(46),
                ),
                onPressed: () => Navigator.pushNamed(
                  context,
                  AppRoutes.simulation3d,
                  arguments: Simulation3dArgs(dossierId: dossierId),
                ),
                icon: const Icon(Icons.view_in_ar_outlined, size: 20),
                label: Text(t('dossier_voir_3d')),
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(46),
              ),
              onPressed: () => Navigator.pushNamed(
                context,
                AppRoutes.recapitulatif,
                arguments: const RecapitulatifArgs(lectureSeule: true),
              ),
              icon: const Icon(Icons.receipt_long, size: 20),
              label: Text(t('confirmation_voir_recap')),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextButton(
              style: TextButton.styleFrom(
                minimumSize: const Size.fromHeight(46),
              ),
              onPressed: () => Navigator.popUntil(
                context,
                ModalRoute.withName(AppRoutes.home),
              ),
              child: Text(t('confirmation_retour_accueil')),
            ),
            const SizedBox(height: AppSpacing.sm),
            Center(
              child: Text(
                transmis
                    ? t('confirmation_transmis_serveur')
                    : t('confirmation_conserve_local'),
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
