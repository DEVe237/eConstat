import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/i18n/app_strings.dart';
import 'core/router/app_routes.dart';
import 'core/theme/app_theme.dart';
import 'presentation/screens/analyse/analyse_ia_screen.dart';
import 'presentation/screens/auth/auth_gate.dart';
import 'presentation/screens/capture/capture_screen.dart';
import 'presentation/screens/confirmation/confirmation_screen.dart';
import 'presentation/screens/formulaire/formulaire_screen.dart';
import 'presentation/screens/profile/change_password_screen.dart';
import 'presentation/screens/profile/edit_profile_screen.dart';
import 'presentation/screens/profile/help_center_screen.dart';
import 'presentation/screens/profile/notifications_settings_screen.dart';
import 'presentation/screens/profile/profile_screen.dart';
import 'presentation/screens/profile/settings_screen.dart';
import 'presentation/screens/recapitulatif/recapitulatif_screen.dart';
import 'presentation/screens/simulation3d/simulation3d_screen.dart';
import 'presentation/state/language_provider.dart';
import 'presentation/state/theme_provider.dart';

void main() {
  runApp(const ProviderScope(child: CamairCostApp()));
}

class CamairCostApp extends ConsumerWidget {
  const CamairCostApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final langue = ref.watch(languageProvider) == 'English' ? 'en' : 'fr';

    return MaterialApp(
      title: 'eConstat',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      builder: (context, child) => AppStrings(langue: langue, child: child!),
      initialRoute: AppRoutes.home,
      routes: {
        AppRoutes.home: (_) => const AuthGate(),
        AppRoutes.capture: (_) => const CaptureScreen(),
        AppRoutes.analyse: (_) => const AnalyseIaScreen(),
        AppRoutes.formulaire: (_) => const FormulaireScreen(),
        AppRoutes.recapitulatif: (_) => const RecapitulatifScreen(),
        AppRoutes.confirmation: (_) => const ConfirmationScreen(),
        AppRoutes.simulation3d: (_) => const Simulation3dScreen(),
        AppRoutes.profile: (_) => const ProfileScreen(),
        AppRoutes.settings: (_) => const SettingsScreen(),
        AppRoutes.editProfile: (_) => const EditProfileScreen(),
        AppRoutes.changePassword: (_) => const ChangePasswordScreen(),
        AppRoutes.notificationsSettings: (_) => const NotificationsSettingsScreen(),
        AppRoutes.helpCenter: (_) => const HelpCenterScreen(),
      },
    );
  }
}
