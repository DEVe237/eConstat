import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';

const _questions = [
  ('aide_q1', 'aide_r1'),
  ('aide_q2', 'aide_r2'),
  ('aide_q3', 'aide_r3'),
  ('aide_q4', 'aide_r4'),
];

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Scaffold(
      appBar: AppBar(title: Text(t('parametres_aide'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          children: [
            for (final q in _questions)
              ExpansionTile(
                title: Text(t(q.$1), style: theme.textTheme.titleSmall),
                childrenPadding: const EdgeInsets.fromLTRB(
                  AppSpacing.page,
                  0,
                  AppSpacing.page,
                  AppSpacing.lg,
                ),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(t(q.$2), style: theme.textTheme.bodyMedium),
                  ),
                ],
              ),
            const Divider(height: 1),
            ListTile(
              leading: Icon(
                Icons.chat_bubble_outline,
                color: theme.colorScheme.primary,
              ),
              title: Text(t('aide_autre_question')),
              subtitle: const Text('support@camaircost.com'),
            ),
          ],
        ),
      ),
    );
  }
}
