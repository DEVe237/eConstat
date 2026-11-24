import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../state/api_providers.dart';
import '../../state/auth_notifier.dart';
import '../../state/constat_draft_notifier.dart';
import '../../widgets/app_card.dart';
import '../../widgets/emergency_card.dart';
import '../notifications/notifications_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final dossiersAsync = ref.watch(historiqueProvider);
    final user = ref.watch(authNotifierProvider).value;
    final enCours =
        dossiersAsync.value
            ?.where((d) => (d['statut'] as String?) == 'brouillon')
            .length ??
        1;
    final historiques = dossiersAsync.value?.length ?? 12;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(historiqueProvider.future),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.page,
              AppSpacing.lg,
              AppSpacing.page,
              AppSpacing.xxl,
            ),
            children: [
              _TopBar(
                userInitial: user == null
                    ? 'J'
                    : (user.prenom.isNotEmpty
                          ? user.prenom[0].toUpperCase()
                          : 'J'),
                onProfileTap: () =>
                    Navigator.pushNamed(context, AppRoutes.profile),
                onNotificationsTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const NotificationsScreen(),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                t('home_bonjour').replaceFirst('%s', user?.prenom ?? 'Japhet'),
                style: theme.textTheme.bodyLarge,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(t('home_accroche'), style: theme.textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.lg),
              _NewConstatCard(
                onTap: () {
                  ref.read(constatDraftProvider.notifier).reset();
                  Navigator.pushNamed(context, AppRoutes.capture);
                },
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      icon: Icons.pending_actions_outlined,
                      value: '$enCours',
                      title: t('home_en_cours'),
                      subtitle: t('home_en_cours_sous_titre'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _StatCard(
                      icon: Icons.history_outlined,
                      value: '$historiques',
                      title: t('home_historique'),
                      subtitle: t('home_historique_sous_titre'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(t('home_urgences'), style: theme.textTheme.headlineMedium),
              const SizedBox(height: AppSpacing.md),
              EmergencyCard(
                title: t('home_police'),
                subtitle: t('home_police_sous_titre'),
                number: '117',
                accent: const Color(0xFFB60B0B),
                icon: Icons.shield,
                onTap: () => launchUrl(Uri(scheme: 'tel', path: '117')),
              ),
              const SizedBox(height: AppSpacing.sm),
              EmergencyCard(
                title: t('home_gendarmerie'),
                subtitle: t('home_gendarmerie_sous_titre'),
                number: '113',
                accent: theme.colorScheme.primary,
                icon: Icons.shield_outlined,
                onTap: () => launchUrl(Uri(scheme: 'tel', path: '113')),
              ),
              const SizedBox(height: AppSpacing.lg),
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: const Color(0xFF2F3338),
                  borderRadius: BorderRadius.circular(AppRadius.xxl),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.info_outline,
                      size: 18,
                      color: Color(0xFFA9C1FA),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            t('home_comment_ca_marche'),
                            style: theme.textTheme.titleSmall?.copyWith(
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            t('home_astuce'),
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: const Color(0xFFD4D8E0),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.userInitial,
    required this.onProfileTap,
    required this.onNotificationsTap,
  });

  final String userInitial;
  final VoidCallback onProfileTap;
  final VoidCallback onNotificationsTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        GestureDetector(
          onTap: onProfileTap,
          child: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: context.surfaceColor,
              shape: BoxShape.circle,
              border: Border.all(color: context.borderColor, width: 1.5),
            ),
            alignment: Alignment.center,
            child: Container(
              width: 27,
              height: 27,
              decoration: BoxDecoration(
                color: context.borderColor,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                userInitial,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
          ),
        ),
        Expanded(
          child: Text(
            AppStrings.of(context).t('home_titre'),
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(
              color: theme.colorScheme.primary,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        GestureDetector(
          onTap: onNotificationsTap,
          child: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: context.surfaceColor,
              shape: BoxShape.circle,
              border: Border.all(color: context.borderColor, width: 1.5),
            ),
            alignment: Alignment.center,
            child: Icon(
              Icons.notifications_outlined,
              size: 18,
              color: theme.colorScheme.primary,
            ),
          ),
        ),
      ],
    );
  }
}

class _NewConstatCard extends StatelessWidget {
  const _NewConstatCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      onTap: onTap,
      color: theme.colorScheme.primary,
      showBorder: false,
      showShadow: true,
      padding: const EdgeInsets.symmetric(
        vertical: AppSpacing.xl,
        horizontal: AppSpacing.lg,
      ),
      child: SizedBox(
        width: double.infinity,
        child: Column(
          children: [
            const Icon(Icons.add_a_photo, size: 36, color: Colors.white),
            const SizedBox(height: AppSpacing.md),
            Text(
              AppStrings.of(context).t('home_nouveau_constat'),
              style: theme.textTheme.titleLarge?.copyWith(color: Colors.white),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              AppStrings.of(context).t('home_nouveau_constat_sous_titre'),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: const Color(0xFFBFD3FF),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.value,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String value;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: SizedBox(
        height: 84,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: theme.colorScheme.primary),
                const Spacer(),
                Text(value, style: theme.textTheme.headlineSmall),
              ],
            ),
            const Spacer(),
            Text(title, style: theme.textTheme.bodyLarge),
            Text(subtitle, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
