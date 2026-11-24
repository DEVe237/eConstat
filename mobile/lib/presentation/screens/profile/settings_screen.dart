import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../state/auth_notifier.dart';
import '../../state/language_provider.dart';
import '../../state/theme_provider.dart';
import '../../widgets/section_header.dart';
import '../../widgets/settings_tile.dart';
import 'language_settings_screen.dart';
import 'legal_screen.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key, this.afficherRetour = true});

  /// Faux quand l'écran est affiché comme onglet de la coquille de
  /// navigation (rien à "pop" dans ce contexte).
  final bool afficherRetour;

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _twoFactorEnabled = true;

  void _ouvrirSelecteurTheme(BuildContext context) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => const _ThemePreferenceSheet(),
    );
  }

  void _ouvrirSelecteurLangue(BuildContext context) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => const LanguagePreferenceSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final themeMode = ref.watch(themeModeProvider);
    final langue = ref.watch(languageProvider);

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
            Row(
              children: [
                if (widget.afficherRetour)
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(
                      Icons.arrow_back,
                      color: theme.colorScheme.primary,
                    ),
                  )
                else
                  const SizedBox(width: 48),
                Expanded(
                  child: Text(
                    t('parametres_titre'),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineLarge,
                  ),
                ),
                const SizedBox(width: 48),
              ],
            ),
            SectionHeader(title: t('parametres_compte')),
            SettingsTile(
              icon: Icons.lock_outline,
              title: t('parametres_mot_de_passe'),
              onTap: () =>
                  Navigator.pushNamed(context, AppRoutes.changePassword),
            ),
            SettingsSwitchTile(
              icon: Icons.shield_outlined,
              title: t('parametres_2fa'),
              subtitle: t('parametres_2fa_sous_titre'),
              value: _twoFactorEnabled,
              onChanged: (value) => setState(() => _twoFactorEnabled = value),
            ),
            SettingsTile(
              icon: Icons.delete_outline,
              title: t('parametres_suppr_compte'),
              subtitle: t('parametres_suppr_compte_sous_titre'),
              onTap: () => _confirmerSuppressionCompte(context, ref),
            ),
            SectionHeader(title: t('parametres_preferences')),
            SettingsTile(
              icon: Icons.notifications_none,
              title: t('parametres_notifications'),
              onTap: () =>
                  Navigator.pushNamed(context, AppRoutes.notificationsSettings),
            ),
            SettingsTile(
              icon: themeMode == ThemeMode.dark
                  ? Icons.dark_mode_outlined
                  : themeMode == ThemeMode.light
                  ? Icons.light_mode_outlined
                  : Icons.brightness_auto_outlined,
              title: t('parametres_theme'),
              trailingText: t(switch (themeMode) {
                ThemeMode.system => 'theme_systeme',
                ThemeMode.light => 'theme_clair',
                ThemeMode.dark => 'theme_sombre',
              }),
              onTap: () => _ouvrirSelecteurTheme(context),
            ),
            SettingsTile(
              icon: Icons.language_outlined,
              title: t('parametres_langue'),
              trailingText: langue,
              onTap: () => _ouvrirSelecteurLangue(context),
            ),
            SectionHeader(title: t('parametres_assistance')),
            SettingsTile(
              icon: Icons.help_outline,
              title: t('parametres_aide'),
              onTap: () => Navigator.pushNamed(context, AppRoutes.helpCenter),
            ),
            SettingsTile(
              icon: Icons.privacy_tip_outlined,
              title: t('parametres_confidentialite'),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => LegalScreen(
                    title: t('parametres_confidentialite'),
                    sections: politiqueConfidentialite,
                    derniereMiseAJour: politiqueConfidentialiteMiseAJour,
                  ),
                ),
              ),
            ),
            SettingsTile(
              icon: Icons.description_outlined,
              title: t('parametres_cgu'),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => LegalScreen(
                    title: t('parametres_cgu'),
                    sections: conditionsUtilisation,
                    derniereMiseAJour: conditionsUtilisationMiseAJour,
                  ),
                ),
              ),
            ),
            SectionHeader(title: t('parametres_application')),
            SettingsTile(
              icon: Icons.info_outline,
              title: t('parametres_a_propos'),
              onTap: () => showAboutDialog(
                context: context,
                applicationName: 'eConstat',
                applicationVersion: '2.4.1 (104)',
                applicationLegalese: t('parametres_a_propos_legalese'),
              ),
            ),
            SettingsTile(
              icon: Icons.ios_share_outlined,
              title: t('parametres_partager'),
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(t('parametres_partage_snackbar'))),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton.icon(
              onPressed: () async {
                await ref.read(authNotifierProvider.notifier).deconnexion();
                if (context.mounted) {
                  Navigator.popUntil(context, (route) => route.isFirst);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFAD6D6),
                foregroundColor: const Color(0xFFB10000),
                elevation: 0,
                minimumSize: const Size.fromHeight(46),
              ),
              icon: const Icon(Icons.logout, size: 20),
              label: Text(t('parametres_deconnexion')),
            ),
            const SizedBox(height: AppSpacing.md),
            Center(
              child: Text(
                'Version 2.4.1 (104)',
                style: theme.textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmerSuppressionCompte(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final t = AppStrings.of(context).t;
    final confirme = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(t('parametres_suppr_dialogue_titre')),
        content: Text(t('parametres_suppr_dialogue_corps')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(t('commun_annuler')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(
              t('commun_supprimer'),
              style: TextStyle(
                color: Theme.of(dialogContext).colorScheme.error,
              ),
            ),
          ),
        ],
      ),
    );
    if (confirme != true) return;

    await ref.read(authNotifierProvider.notifier).deconnexion();
    if (context.mounted) {
      Navigator.popUntil(context, (route) => route.isFirst);
    }
  }
}

class _ThemePreferenceSheet extends ConsumerWidget {
  const _ThemePreferenceSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selection = ref.watch(themeModeProvider);
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
                t('theme_choisir'),
                style: theme.textTheme.titleLarge,
              ),
            ),
            for (final entry in const {
              ThemeMode.system: (
                Icons.brightness_auto_outlined,
                'theme_systeme',
                'theme_systeme_desc',
              ),
              ThemeMode.light: (
                Icons.light_mode_outlined,
                'theme_clair',
                'theme_clair_desc',
              ),
              ThemeMode.dark: (
                Icons.dark_mode_outlined,
                'theme_sombre',
                'theme_sombre_desc',
              ),
            }.entries)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  entry.value.$1,
                  color: selection == entry.key
                      ? theme.colorScheme.primary
                      : null,
                ),
                title: Text(t(entry.value.$2)),
                subtitle: Text(t(entry.value.$3)),
                trailing: selection == entry.key
                    ? Icon(Icons.check, color: theme.colorScheme.primary)
                    : null,
                onTap: () {
                  ref.read(themeModeProvider.notifier).definir(entry.key);
                  Navigator.pop(context);
                },
              ),
          ],
        ),
      ),
    );
  }
}
