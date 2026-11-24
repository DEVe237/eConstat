import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../widgets/emergency_card.dart';

class UrgenceScreen extends StatelessWidget {
  const UrgenceScreen({super.key});

  Future<void> _appeler(String numero) =>
      launchUrl(Uri(scheme: 'tel', path: numero));

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.page,
            AppSpacing.xl,
            AppSpacing.page,
            AppSpacing.xxl,
          ),
          children: [
            Text(
              t('urgence_titre'),
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineLarge,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              t('urgence_sous_titre'),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.lg),
            EmergencyCard(
              title: t('home_police'),
              subtitle: t('home_police_sous_titre'),
              number: '117',
              accent: const Color(0xFFB60B0B),
              icon: Icons.local_police,
              onTap: () => _appeler('117'),
            ),
            const SizedBox(height: AppSpacing.sm),
            EmergencyCard(
              title: t('home_gendarmerie'),
              subtitle: t('home_gendarmerie_sous_titre'),
              number: '113',
              accent: theme.colorScheme.primary,
              icon: Icons.shield_outlined,
              onTap: () => _appeler('113'),
            ),
            const SizedBox(height: AppSpacing.sm),
            EmergencyCard(
              title: t('urgence_pompiers'),
              subtitle: t('urgence_pompiers_sous_titre'),
              number: '118',
              accent: const Color(0xFFE0692B),
              icon: Icons.local_fire_department_outlined,
              onTap: () => _appeler('118'),
            ),
            const SizedBox(height: AppSpacing.sm),
            EmergencyCard(
              title: t('urgence_medicale'),
              subtitle: t('urgence_medicale_sous_titre'),
              number: '119',
              accent: const Color(0xFF1E8E5A),
              icon: Icons.medical_services_outlined,
              onTap: () => _appeler('119'),
            ),
            const SizedBox(height: AppSpacing.sm),
            EmergencyCard(
              title: t('urgence_assistance'),
              subtitle: t('urgence_assistance_sous_titre'),
              number: '651',
              accent: const Color(0xFF6D28D9),
              icon: Icons.support_agent_outlined,
              onTap: () => _appeler('651'),
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
                    size: 20,
                    color: Color(0xFFA9C1FA),
                  ),
                  const SizedBox(width: AppSpacing.sm),
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
                          t('urgence_astuce'),
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
    );
  }
}
