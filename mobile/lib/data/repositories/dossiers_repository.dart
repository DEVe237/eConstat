import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../domain/entities/analyse_ia.dart';
import '../../domain/entities/capture_guidee.dart';
import '../../domain/entities/constat_draft.dart';

/// Résultat retourné par le backend une fois le dossier transmis
/// (POST /dossiers/{id}/soumettre — cahier de conception §5.2).
class DossierEnvoye {
  const DossierEnvoye({
    required this.id,
    required this.statut,
    required this.hashIntegrite,
  });

  factory DossierEnvoye.fromJson(Map<String, dynamic> json) {
    return DossierEnvoye(
      id: json['id'] as String,
      statut: json['statut'] as String? ?? 'transmis',
      hashIntegrite: json['hashIntegrite'] as String? ?? '',
    );
  }

  final String id;
  final String statut;
  final String hashIntegrite;

  String get numeroCourt => id.substring(0, 8).toUpperCase();
}

class DossiersRepository {
  DossiersRepository(this._api);

  final ApiClient _api;

  /// Fin de la capture guidée : crée le brouillon côté serveur, y dépose les
  /// photos, la vidéo du tour et la liste des documents absents. Renvoie
  /// l'identifiant du dossier. [progression] reçoit (envoyés, total).
  Future<String> preparerBrouillon(
    ConstatDraft draft, {
    void Function(int envoyes, int total)? progression,
    void Function(String dossierId)? surCreation,
    void Function(CaptureGuidee capture)? surEnvoi,
  }) async {
    final captures = [
      for (final etape in etapesCapture)
        if (draft.captures[etape.id] != null) draft.captures[etape.id]!,
    ];
    final dossierId = draft.dossierId ?? await _creerDossier(draft);
    // Mémorisé tout de suite : un nouvel essai reprend ce dossier au lieu d'en créer un autre.
    surCreation?.call(dossierId);
    for (var i = 0; i < captures.length; i++) {
      progression?.call(i, captures.length);
      if (draft.envoyees[captures[i].etape.id] == captures[i].chemin) continue;
      await _uploaderCapture(dossierId, captures[i]);
      surEnvoi?.call(captures[i]);
    }
    progression?.call(captures.length, captures.length);
    await _api.dio.put('/dossiers/$dossierId/documents-absents', data: {
      'documents': [
        for (final etape in etapesCapture)
          if (draft.documentsAbsents.contains(etape.id))
            {'conducteur': etape.conducteur, 'categorie': etape.categorie},
      ],
    });
    return dossierId;
  }

  /// Analyse IA des photos (plaques, dégâts, zone de choc, route, météo).
  /// Ne lève pas d'erreur : un échec renvoie une analyse « echouee » et le
  /// conducteur remplit simplement le formulaire lui-même.
  Future<AnalyseIa> analyserPhotos(String dossierId) async {
    try {
      final reponse = await _api.dio.post(
        '/dossiers/$dossierId/analyse-ia',
        options: Options(receiveTimeout: const Duration(seconds: 150)),
      );
      return AnalyseIa.fromJson(reponse.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return AnalyseIa(statut: 'echouee', erreur: e.message);
    }
  }

  /// Orchestre l'envoi complet d'un constat : brouillon (s'il n'a pas déjà été
  /// préparé à la fin de la capture), circonstances, véhicules, signatures,
  /// puis soumission finale. Reflète le flux mobile → backend du diagramme de
  /// séquence (cahier de conception §3.3).
  Future<DossierEnvoye> envoyerConstat(ConstatDraft draft) async {
    final dossierId = draft.dossierId ?? await preparerBrouillon(draft);
    await _api.dio.patch('/dossiers/$dossierId', data: _circonstances(draft));

    // Remplace la liste entière : un renvoi ne duplique pas les véhicules.
    await _api.dio.put('/dossiers/$dossierId/vehicules', data: {
      'vehicules': [
        for (final v in draft.vehicules)
          {
            'conducteurNom': v.conducteurNom,
            'plaque': v.plaque,
            if (v.marque.isNotEmpty) 'marque': v.marque,
            if (v.vitesseEstimee.isNotEmpty) 'vitesseEstimee': v.vitesseEstimee,
            if (v.sensCirculation.isNotEmpty) 'sensCirculation': v.sensCirculation,
            if (v.zoneChoc.isNotEmpty) 'zoneChoc': v.zoneChoc,
          },
      ],
    });

    for (final entry in draft.signatures.entries) {
      await _ajouterSignature(dossierId, entry.key, entry.value);
    }

    final reponse = await _api.dio.post('/dossiers/$dossierId/soumettre');
    return DossierEnvoye.fromJson(reponse.data as Map<String, dynamic>);
  }

  Future<List<Map<String, dynamic>>> listerDossiers() async {
    final reponse = await _api.dio.get('/dossiers');
    return List<Map<String, dynamic>>.from(reponse.data as List);
  }

  Future<Map<String, dynamic>> detail(String dossierId) async {
    final reponse = await _api.dio.get('/dossiers/$dossierId');
    return Map<String, dynamic>.from(reponse.data as Map);
  }

  /// Avancement du traitement par les autorités (léger : relu toutes les quelques secondes).
  Future<Map<String, dynamic>> suivi(String dossierId) async {
    final reponse = await _api.dio.get('/dossiers/$dossierId/suivi');
    return Map<String, dynamic>.from(reponse.data as Map);
  }

  Future<String> _creerDossier(ConstatDraft draft) async {
    final reponse = await _api.dio.post('/dossiers', data: _circonstances(draft));
    return (reponse.data as Map<String, dynamic>)['id'] as String;
  }

  Map<String, dynamic> _circonstances(ConstatDraft draft) => {
        if (draft.dateAccident != null)
          'dateAccident': draft.dateAccident!.toIso8601String(),
        if (draft.latitude != null) 'lat': draft.latitude,
        if (draft.longitude != null) 'lng': draft.longitude,
        if (draft.conditionsMeteo.isNotEmpty)
          'conditionsMeteo': draft.conditionsMeteo,
      };

  Future<void> _uploaderCapture(String dossierId, CaptureGuidee capture) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(capture.chemin),
    });
    await _api.dio.post(
      '/dossiers/$dossierId/media',
      data: formData,
      queryParameters: {
        'type': capture.etape.video ? 'video' : 'photo',
        'categorie': capture.etape.categorie,
        if (capture.etape.conducteur != null) 'conducteur': capture.etape.conducteur,
        if (capture.dureeSecondes != null) 'duree': capture.dureeSecondes!.toStringAsFixed(1),
      },
      options: Options(sendTimeout: const Duration(minutes: 3)),
    );
  }

  Future<void> _ajouterSignature(
    String dossierId,
    String conducteurNom,
    Uint8List pngBytes,
  ) {
    return _api.dio.post('/dossiers/$dossierId/signature', data: {
      'conducteurNom': conducteurNom,
      'imageBase64': base64Encode(pngBytes),
    });
  }
}
