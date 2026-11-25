import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/token_storage.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/dossiers_repository.dart';
import '../../data/repositories/simulation3d_repository.dart';
import 'auth_notifier.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(tokenStorage: ref.watch(tokenStorageProvider)),
);

final dossiersRepositoryProvider = Provider<DossiersRepository>(
  (ref) => DossiersRepository(ref.watch(apiClientProvider)),
);

final simulation3dRepositoryProvider = Provider<Simulation3dRepository>(
  (ref) => Simulation3dRepository(ref.watch(apiClientProvider)),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(tokenStorageProvider),
  ),
);

/// Rechargé à chaque changement de compte : un conducteur ne voit jamais la
/// liste en mémoire du précédent. Tant qu'un dossier attend sa décision finale,
/// la liste se relit seule.
final historiqueProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final id = ref.watch(authNotifierProvider.select((u) => u.value?.id));
  if (id == null) return const [];
  final dossiers = await ref.watch(dossiersRepositoryProvider).listerDossiers();
  if (ref.mounted && dossiers.any((d) => d['statut'] == 'transmis' || d['statut'] == 'conteste')) {
    final minuteur = Timer(const Duration(seconds: 15), ref.invalidateSelf);
    ref.onDispose(minuteur.cancel);
  }
  return dossiers;
});

/// Suivi en direct du traitement : relu toutes les 5 s jusqu'à la validation
/// finale, puis toutes les 30 s (transmission à l'assureur, contestation).
/// Une coupure réseau est ignorée : le dernier état connu reste affiché.
final suiviProvider = StreamProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async* {
  ref.watch(authNotifierProvider.select((u) => u.value?.id));
  final repo = ref.watch(dossiersRepositoryProvider);
  var actif = true;
  ref.onDispose(() => actif = false);
  var attente = const Duration(seconds: 5);
  while (actif) {
    final etat = WidgetsBinding.instance.lifecycleState;
    // Application en arrière-plan : pas d'appel réseau inutile.
    if (etat == null || etat == AppLifecycleState.resumed) {
      Map<String, dynamic>? suivi;
      try {
        suivi = await repo.suivi(id);
      } on Exception catch (_) {}
      if (!actif) return;
      if (suivi != null) {
        attente = Duration(seconds: suivi['statut'] == 'valide' ? 30 : 5);
        yield suivi;
      }
    }
    await Future<void>.delayed(attente);
  }
});

/// Détail complet d'un dossier, relu à chaque ouverture : les liens des photos
/// expirent et l'agent peut avoir rendu sa décision entre-temps.
final dossierDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) {
  ref.watch(authNotifierProvider.select((u) => u.value?.id));
  return ref.watch(dossiersRepositoryProvider).detail(id);
});
