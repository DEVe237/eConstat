import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/simulation_3d.dart';

/// Déclenchement/suivi de la reconstitution 3D d'un dossier
/// (POST/GET /dossiers/{id}/simulation3d — cahier de conception §5.2/§6).
class Simulation3dRepository {
  Simulation3dRepository(this._api);

  final ApiClient _api;

  Future<Simulation3D> declencherGeneration(String dossierId) async {
    if (kModeSimule) return _echecSimule(dossierId);

    final reponse = await _api.dio.post('/dossiers/$dossierId/simulation3d');
    return Simulation3D.fromJson(reponse.data as Map<String, dynamic>);
  }

  /// Retourne `null` si aucune génération n'a encore été demandée pour ce
  /// dossier (le backend répond 404 dans ce cas).
  Future<Simulation3D?> obtenirStatut(String dossierId) async {
    if (kModeSimule) return _echecSimule(dossierId);

    try {
      final reponse = await _api.dio.get('/dossiers/$dossierId/simulation3d');
      return Simulation3D.fromJson(reponse.data as Map<String, dynamic>);
    } on DioException catch (err) {
      if (err.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// La reconstitution 3D dépend d'une vraie infrastructure serveur
  /// (rendu Puppeteer, stockage MinIO, file Redis) qu'on ne peut pas
  /// simuler utilement en mode design — on renvoie un état d'échec propre
  /// plutôt que de laisser l'écran tourner indéfiniment ou planter.
  Simulation3D _echecSimule(String dossierId) {
    return Simulation3D(
      id: const Uuid().v4(),
      dossierId: dossierId,
      statut: 'echec',
      erreur: 'Backend indisponible (mode design)',
    );
  }
}
