import 'dart:convert';

import '../../core/network/api_client.dart';
import '../../core/network/token_storage.dart';
import '../../domain/entities/utilisateur.dart';

class AuthRepository {
  AuthRepository(this._api, this._storage);

  final ApiClient _api;
  final TokenStorage _storage;

  Future<Utilisateur?> utilisateurConnecte() async {
    final token = await _storage.lireToken();
    final userJson = await _storage.lireUtilisateurJson();
    if (token == null || userJson == null) return null;
    // Session laissée par une ancienne version de démonstration : inutilisable avec le vrai serveur.
    if (token.startsWith('jeton-simule-')) {
      await _storage.effacer();
      return null;
    }
    return Utilisateur.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
  }

  Future<Utilisateur> connexion({
    required String email,
    required String motDePasse,
  }) async {
    final reponse = await _api.dio.post('/auth/login', data: {
      'email': email,
      'motDePasse': motDePasse,
    });
    return _persisterSession(reponse.data as Map<String, dynamic>);
  }

  Future<Utilisateur> inscription({
    required String nom,
    required String prenom,
    required String email,
    required String motDePasse,
    String? telephone,
    String? permisConduire,
  }) async {
    final reponse = await _api.dio.post('/auth/register', data: {
      'nom': nom,
      'prenom': prenom,
      'email': email,
      'motDePasse': motDePasse,
      if (telephone != null && telephone.isNotEmpty) 'telephone': telephone,
      if (permisConduire != null && permisConduire.isNotEmpty)
        'permisConduire': permisConduire,
    });
    return _persisterSession(reponse.data as Map<String, dynamic>);
  }

  Future<void> deconnexion() => _storage.effacer();

  Future<Utilisateur> mettreAJourProfil(Utilisateur utilisateur) async {
    final reponse = await _api.dio.patch('/auth/moi', data: {
      'prenom': utilisateur.prenom,
      'nom': utilisateur.nom,
      if (utilisateur.telephone != null) 'telephone': utilisateur.telephone,
      if (utilisateur.permisConduire != null) 'permisConduire': utilisateur.permisConduire,
      if (utilisateur.adresse != null) 'adresse': utilisateur.adresse,
      if (utilisateur.assurance != null) 'assurance': utilisateur.assurance,
    });
    final aJour = Utilisateur.fromJson(reponse.data as Map<String, dynamic>);
    await _storage.sauvegarderUtilisateur(jsonEncode(aJour.toJson()));
    return aJour;
  }

  Future<void> changerMotDePasse({required String actuel, required String nouveau}) {
    return _api.dio.post('/auth/mot-de-passe', data: {'actuel': actuel, 'nouveau': nouveau});
  }

  Future<Utilisateur> _persisterSession(Map<String, dynamic> data) async {
    final token = data['accessToken'] as String;
    final user = Utilisateur.fromJson(data['user'] as Map<String, dynamic>);
    await _storage.sauvegarder(token: token, userJson: jsonEncode(user.toJson()));
    return user;
  }
}
