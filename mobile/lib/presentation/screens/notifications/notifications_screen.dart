import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';

class _NotificationItem {
  const _NotificationItem(
    this.icon,
    this.titreCle,
    this.messageCle,
    this.quand,
  );

  final IconData icon;
  final String titreCle;
  final String messageCle;
  final String quand;
}

const _notifications = [
  _NotificationItem(
    Icons.check_circle_outline,
    'notif_transmis_titre',
    'notif_transmis_message',
    'notif_hier',
  ),
  _NotificationItem(
    Icons.view_in_ar_outlined,
    'notif_3d_titre',
    'notif_3d_message',
    'notif_3j',
  ),
  _NotificationItem(
    Icons.info_outline,
    'notif_bienvenue_titre',
    'notif_bienvenue_message',
    'notif_7j',
  ),
];

/// Fil de notifications — écran statique pour l'instant (mode design, pas de
/// backend de notifications), mais navigable depuis la cloche d'Accueil.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Scaffold(
      appBar: AppBar(title: Text(t('notif_titre'))),
      body: SafeArea(
        child: ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.page),
          itemCount: _notifications.length,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
          itemBuilder: (context, index) {
            final item = _notifications[index];
            return Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(AppRadius.xxl),
                border: Border.all(color: context.borderColor),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(
                        alpha: context.isDark ? 0.22 : 0.12,
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      item.icon,
                      size: 19,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t(item.titreCle),
                          style: theme.textTheme.titleSmall,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          t(item.messageCle),
                          style: theme.textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(t(item.quand), style: theme.textTheme.bodySmall),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
