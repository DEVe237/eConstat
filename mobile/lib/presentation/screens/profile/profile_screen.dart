import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../state/auth_notifier.dart';
import '../../widgets/section_header.dart';
import '../../widgets/settings_tile.dart';
import 'document_detail_screen.dart';
import 'simulation3d_picker_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key, this.afficherRetour = true});

  /// Faux quand l'écran est affiché comme onglet de la coquille de
  /// navigation (rien à "pop" dans ce contexte, contrairement à quand on y
  /// accède depuis Accueil).
  final bool afficherRetour;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final user = ref.watch(authNotifierProvider).value;
    final prenom = user?.prenom ?? 'Jean';
    final nom = user?.nom ?? 'Dupont';
    final email = user?.email ?? 'jean.dupont@email.com';
    final telephone = user?.telephone ?? '+33 6 12 34 56 78';
    final permis = user?.permisConduire ?? '15AA12345';

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
                if (afficherRetour)
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
                    t('profil_titre'),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineLarge,
                  ),
                ),
                const SizedBox(width: 48),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Center(
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: context.surfaceColor,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(
                            alpha: context.isDark ? 0.3 : 0.06,
                          ),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: CircleAvatar(
                      radius: 40,
                      backgroundColor: theme.colorScheme.primary.withValues(
                        alpha: context.isDark ? 0.22 : 0.12,
                      ),
                      child: Icon(
                        Icons.person,
                        size: 38,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 2,
                    child: GestureDetector(
                      onTap: () =>
                          Navigator.pushNamed(context, AppRoutes.editProfile),
                      child: Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: context.surfaceColor,
                            width: 2.5,
                          ),
                        ),
                        child: const Icon(
                          Icons.edit,
                          color: Colors.white,
                          size: 14,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              '$prenom $nom',
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              email,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: AppSpacing.xl),
            const Divider(),
            SectionHeader(title: t('profil_compte')),
            SettingsTile(
              icon: Icons.edit_outlined,
              title: t('profil_modifier'),
              onTap: () => Navigator.pushNamed(context, AppRoutes.editProfile),
            ),
            SettingsTile(
              icon: Icons.settings_outlined,
              title: t('profil_parametres'),
              subtitle: t('profil_parametres_sous_titre'),
              onTap: () => Navigator.pushNamed(context, AppRoutes.settings),
            ),
            SettingsTile(
              icon: Icons.view_in_ar_outlined,
              title: t('profil_reconstitution_3d'),
              subtitle: t('profil_reconstitution_3d_sous_titre'),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const Simulation3dPickerScreen(),
                ),
              ),
            ),
            SectionHeader(title: t('profil_infos_perso')),
            SettingsTile(
              icon: Icons.phone_outlined,
              title: t('profil_telephone'),
              subtitle: telephone,
              onTap: () => Navigator.pushNamed(context, AppRoutes.editProfile),
            ),
            SettingsTile(
              icon: Icons.mail_outline,
              title: t('profil_email'),
              subtitle: email,
              onTap: () => Navigator.pushNamed(context, AppRoutes.editProfile),
            ),
            SettingsTile(
              icon: Icons.home_outlined,
              title: t('profil_adresse'),
              subtitle: '123 Rue de la République, 75001 Paris',
              onTap: () => Navigator.pushNamed(context, AppRoutes.editProfile),
            ),
            SectionHeader(title: t('profil_documents')),
            SettingsTile(
              icon: Icons.badge_outlined,
              title: t('profil_permis'),
              subtitle: permis,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => DocumentDetailScreen(
                    title: t('profil_permis'),
                    icon: Icons.badge_outlined,
                    label: t('profil_numero_permis'),
                    initialValue: permis,
                    onSave: (valeur) => ref
                        .read(authNotifierProvider.notifier)
                        .mettreAJourProfil(
                          (ref.read(authNotifierProvider).value!).copyWith(
                            permisConduire: valeur,
                          ),
                        ),
                  ),
                ),
              ),
            ),
            SettingsTile(
              icon: Icons.verified_user_outlined,
              title: t('profil_assurance'),
              subtitle: 'MACIF — Contrat N° 987654321',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => DocumentDetailScreen(
                    title: t('profil_assurance'),
                    icon: Icons.verified_user_outlined,
                    label: t('profil_assureur_contrat'),
                    initialValue: 'MACIF — Contrat N° 987654321',
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(46),
              ),
              onPressed: () =>
                  Navigator.pushNamed(context, AppRoutes.editProfile),
              child: Text(t('profil_modifier')),
            ),
            const SizedBox(height: AppSpacing.md),
            TextButton(
              onPressed: () =>
                  ref.read(authNotifierProvider.notifier).deconnexion(),
              child: Text(
                t('profil_deconnexion'),
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
