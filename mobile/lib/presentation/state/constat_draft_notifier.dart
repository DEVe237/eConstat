import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/analyse_ia.dart';
import '../../domain/entities/capture_guidee.dart';
import '../../domain/entities/constat_draft.dart';
import '../../domain/entities/vehicule_implique.dart';

class ConstatDraftNotifier extends Notifier<ConstatDraft> {
  @override
  ConstatDraft build() => const ConstatDraft();

  void reset() => state = const ConstatDraft();

  /// Enregistre (ou remplace) le média d'une étape de la capture guidée.
  void setCapture(EtapeCapture etape, String chemin, {double? dureeSecondes}) {
    state = state.copyWith(
      captures: {
        ...state.captures,
        etape.id: CaptureGuidee(etape: etape, chemin: chemin, dureeSecondes: dureeSecondes),
      },
      documentsAbsents: {...state.documentsAbsents}..remove(etape.id),
    );
  }

  /// « Je n'ai pas ce document » : l'étape est terminée sans photo.
  void marquerDocumentAbsent(EtapeCapture etape) {
    state = state.copyWith(
      captures: {...state.captures}..remove(etape.id),
      documentsAbsents: {...state.documentsAbsents, etape.id},
      // Le serveur supprime la photo d'un document déclaré absent.
      envoyees: {...state.envoyees}..remove(etape.id),
    );
  }

  void annulerDocumentAbsent(EtapeCapture etape) {
    state = state.copyWith(documentsAbsents: {...state.documentsAbsents}..remove(etape.id));
  }

  void setDossierId(String id) => state = state.copyWith(dossierId: id);

  void marquerEnvoyee(CaptureGuidee capture) {
    state = state.copyWith(envoyees: {...state.envoyees, capture.etape.id: capture.chemin});
  }

  /// Mémorise l'analyse IA et pré-remplit ce que le conducteur n'a pas encore saisi.
  void appliquerAnalyseIa(AnalyseIa analyse) {
    var vehicules = state.vehicules.isEmpty
        ? [const VehiculeImplique(), const VehiculeImplique()]
        : List.of(state.vehicules);
    var meteo = state.conditionsMeteo;
    if (analyse.reussie) {
      vehicules = [
        for (var i = 0; i < vehicules.length; i++)
          _preRemplir(vehicules[i], analyse.vehicule(i == 0 ? 'A' : 'B')),
      ];
      if (meteo.isEmpty && analyse.conditionsMeteo.startsWith('meteo_')) {
        meteo = analyse.conditionsMeteo;
      }
    }
    state = state.copyWith(analyseIa: analyse, vehicules: vehicules, conditionsMeteo: meteo);
  }

  VehiculeImplique _preRemplir(VehiculeImplique v, VehiculeAnalyse? ia) {
    if (ia == null) return v;
    return v.copyWith(
      plaque: v.plaque.isEmpty ? ia.plaque : null,
      marque: v.marque.isEmpty ? ia.marque : null,
      zoneChoc: v.zoneChoc.isEmpty && ia.zoneChoc != 'inconnue' ? ia.zoneChoc : null,
    );
  }

  void setLocalisation({required double latitude, required double longitude}) {
    state = state.copyWith(
      latitude: latitude,
      longitude: longitude,
      dateAccident: DateTime.now(),
    );
  }

  void setVehicules(List<VehiculeImplique> vehicules) {
    state = state.copyWith(vehicules: vehicules);
  }

  void setConditionsMeteo(String value) {
    state = state.copyWith(conditionsMeteo: value);
  }

  void setSignature(String conducteurNom, Uint8List pngBytes) {
    state = state.copyWith(
      signatures: {...state.signatures, conducteurNom: pngBytes},
    );
  }
}

final constatDraftProvider =
    NotifierProvider<ConstatDraftNotifier, ConstatDraft>(
  ConstatDraftNotifier.new,
);
