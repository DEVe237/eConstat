import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/auth_notifier.dart';
import '../shell/main_shell.dart';
import 'login_screen.dart';

/// Point d'entrée de l'app : affiche l'écran de connexion tant qu'aucun
/// utilisateur n'est authentifié, puis la coquille principale une fois
/// connecté. La session est relue depuis le stockage sécurisé au démarrage.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authNotifierProvider);

    return auth.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (_, _) => const LoginScreen(),
      data: (user) => user == null ? const LoginScreen() : const MainShell(),
    );
  }
}
