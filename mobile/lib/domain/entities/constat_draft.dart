import 'dart:typed_data';

import 'analyse_ia.dart';
import 'capture_guidee.dart';
import 'vehicule_implique.dart';

/// Constat en cours de constitution, du côté de l'app mobile, avant envoi au backend.
/// Correspond au brouillon local de l'entité DossierConstat (cahier de conception §7.1).
class ConstatDraft {
  const ConstatDraft({
    this.captures = const {},
    this.documentsAbsents = const {},
    this.dossierId,
    this.envoyees = const {},
    this.analyseIa,
    this.latitude,
    this.longitude,
    this.dateAccident,
    this.vehicules = const [],
    this.conditionsMeteo = '',
    this.signatures = const {},
  });

  /// Médias de la capture guidée, indexés par identifiant d'étape (`plaque_A`…).
  final Map<String, CaptureGuidee> captures;

  /// Étapes « Je n'ai pas ce document » (identifiants d'étape).
  final Set<String> documentsAbsents;

  /// Identifiant du brouillon côté serveur, créé à la fin de la capture pour
  /// que l'IA puisse analyser les photos avant le formulaire.
  final String? dossierId;
  final AnalyseIa? analyseIa;

  /// Médias déjà reçus par le serveur : identifiant d'étape -> chemin envoyé.
  /// Après une coupure, seuls les médias manquants ou repris sont renvoyés.
  final Map<String, String> envoyees;

  final double? latitude;
  final double? longitude;
  final DateTime? dateAccident;
  final List<VehiculeImplique> vehicules;
  final String conditionsMeteo;

  /// Clé = nom du conducteur signataire, valeur = image PNG de la signature.
  final Map<String, Uint8List> signatures;

  bool get aLocalisation => latitude != null && longitude != null;

  /// Toutes les photos, dans l'ordre de la capture guidée.
  List<String> get photoPaths => [
        for (final etape in etapesCapture)
          if (!etape.video && captures[etape.id] != null) captures[etape.id]!.chemin,
      ];

  String? get videoPath => captures['video_tour']?.chemin;

  /// Une étape est terminée quand le média est pris ou le document déclaré absent.
  bool etapeFaite(EtapeCapture etape) =>
      captures.containsKey(etape.id) || documentsAbsents.contains(etape.id);

  bool get captureComplete => etapesCapture.every(etapeFaite);

  ConstatDraft copyWith({
    Map<String, CaptureGuidee>? captures,
    Set<String>? documentsAbsents,
    String? dossierId,
    Map<String, String>? envoyees,
    AnalyseIa? analyseIa,
    double? latitude,
    double? longitude,
    DateTime? dateAccident,
    List<VehiculeImplique>? vehicules,
    String? conditionsMeteo,
    Map<String, Uint8List>? signatures,
  }) {
    return ConstatDraft(
      captures: captures ?? this.captures,
      documentsAbsents: documentsAbsents ?? this.documentsAbsents,
      dossierId: dossierId ?? this.dossierId,
      envoyees: envoyees ?? this.envoyees,
      analyseIa: analyseIa ?? this.analyseIa,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      dateAccident: dateAccident ?? this.dateAccident,
      vehicules: vehicules ?? this.vehicules,
      conditionsMeteo: conditionsMeteo ?? this.conditionsMeteo,
      signatures: signatures ?? this.signatures,
    );
  }
}
