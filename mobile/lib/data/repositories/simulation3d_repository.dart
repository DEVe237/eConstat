import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../../domain/entities/simulation_3d.dart';

/// Déclenchement/suivi de la reconstitution 3D d'un dossier
/// (POST/GET /dossiers/{id}/simulation3d — cahier de conception §5.2/§6).
class Simulation3dRepository {
  Simulation3dRepository(this._api);

  final ApiClient _api;

  Future<Simulation3D> declencherGeneration(String dossierId) async {
    final reponse = await _api.dio.post('/dossiers/$dossierId/simulation3d');
    return Simulation3D.fromJson(reponse.data as Map<String, dynamic>);
  }

  /// Retourne `null` si aucune génération n'a encore été demandée pour ce
  /// dossier (le backend répond 404 dans ce cas).
  Future<Simulation3D?> obtenirStatut(String dossierId) async {
    try {
      final reponse = await _api.dio.get('/dossiers/$dossierId/simulation3d');
      return Simulation3D.fromJson(reponse.data as Map<String, dynamic>);
    } on DioException catch (err) {
      if (err.response?.statusCode == 404) return null;
      rethrow;
    }
  }
}
