import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/utilisateur.dart';
import 'api_providers.dart';

/// null = personne n'est connecté. Chargé au démarrage depuis le stockage
/// sécurisé pour garder la session active entre deux lancements de l'app.
class AuthNotifier extends AsyncNotifier<Utilisateur?> {
  @override
  Future<Utilisateur?> build() {
    return ref.read(authRepositoryProvider).utilisateurConnecte();
  }

  Future<void> connexion({required String email, required String motDePasse}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).connexion(
            email: email,
            motDePasse: motDePasse,
          ),
    );
  }

  Future<void> inscription({
    required String nom,
    required String prenom,
    required String email,
    required String motDePasse,
    String? telephone,
    String? permisConduire,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).inscription(
            nom: nom,
            prenom: prenom,
            email: email,
            motDePasse: motDePasse,
            telephone: telephone,
            permisConduire: permisConduire,
          ),
    );
  }

  Future<void> deconnexion() async {
    await ref.read(authRepositoryProvider).deconnexion();
    state = const AsyncData(null);
  }

  Future<void> mettreAJourProfil(Utilisateur utilisateur) async {
    final misAJour = await ref.read(authRepositoryProvider).mettreAJourProfil(utilisateur);
    state = AsyncData(misAJour);
  }
}

final authNotifierProvider = AsyncNotifierProvider<AuthNotifier, Utilisateur?>(
  AuthNotifier.new,
);
