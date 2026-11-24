import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/simulation_3d.dart';
import 'api_providers.dart';

/// Statut de la reconstitution 3D d'un dossier, avec polling automatique
/// tant que la génération est en cours côté worker (cahier de conception
/// §6.2 — la génération est asynchrone, découplée de l'API).
class Simulation3dNotifier extends AsyncNotifier<Simulation3D?> {
  Simulation3dNotifier(this.dossierId);

  final String dossierId;
  Timer? _timer;

  @override
  Future<Simulation3D?> build() async {
    ref.onDispose(() => _timer?.cancel());
    final resultat =
        await ref.read(simulation3dRepositoryProvider).obtenirStatut(dossierId);
    _planifierPollingSiNecessaire(resultat);
    return resultat;
  }

  void _planifierPollingSiNecessaire(Simulation3D? sim) {
    _timer?.cancel();
    if (sim != null && sim.enCours) {
      _timer = Timer(const Duration(seconds: 3), _rafraichir);
    }
  }

  Future<void> _rafraichir() async {
    final resultat =
        await ref.read(simulation3dRepositoryProvider).obtenirStatut(dossierId);
    state = AsyncData(resultat);
    _planifierPollingSiNecessaire(resultat);
  }

  Future<void> declencher() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(simulation3dRepositoryProvider).declencherGeneration(dossierId),
    );
    _planifierPollingSiNecessaire(state.value);
  }
}

final simulation3dProvider =
    AsyncNotifierProvider.family<Simulation3dNotifier, Simulation3D?, String>(
  Simulation3dNotifier.new,
);
