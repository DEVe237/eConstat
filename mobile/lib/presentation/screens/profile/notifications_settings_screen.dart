import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../widgets/settings_tile.dart';

class NotificationsSettingsScreen extends StatefulWidget {
  const NotificationsSettingsScreen({super.key});

  @override
  State<NotificationsSettingsScreen> createState() =>
      _NotificationsSettingsScreenState();
}

class _NotificationsSettingsScreenState
    extends State<NotificationsSettingsScreen> {
  bool _push = true;
  bool _email = true;
  bool _sms = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

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
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(
                    Icons.arrow_back,
                    color: theme.colorScheme.primary,
                  ),
                ),
                Expanded(
                  child: Text(
                    t('parametres_notifications'),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineLarge,
                  ),
                ),
                const SizedBox(width: 48),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            SettingsSwitchTile(
              icon: Icons.notifications_active_outlined,
              title: t('notifp_push'),
              subtitle: t('notifp_push_sous'),
              value: _push,
              onChanged: (v) => setState(() => _push = v),
            ),
            SettingsSwitchTile(
              icon: Icons.mail_outline,
              title: t('notifp_email'),
              subtitle: t('notifp_email_sous'),
              value: _email,
              onChanged: (v) => setState(() => _email = v),
            ),
            SettingsSwitchTile(
              icon: Icons.sms_outlined,
              title: t('notifp_sms'),
              subtitle: t('notifp_sms_sous'),
              value: _sms,
              onChanged: (v) => setState(() => _sms = v),
            ),
          ],
        ),
      ),
    );
  }
}
