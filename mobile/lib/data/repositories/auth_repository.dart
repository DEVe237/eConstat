import 'dart:convert';

import 'package:uuid/uuid.dart';

import '../../core/config/app_config.dart';
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
    // Session laissée par le mode simulé : inutilisable avec le vrai serveur.
    if (!kModeSimule && token.startsWith('jeton-simule-')) {
      await _storage.effacer();
      return null;
    }
    return Utilisateur.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
  }

  Future<Utilisateur> connexion({
    required String email,
    required String motDePasse,
  }) async {
    if (kModeSimule) {
      final prenom = email.split('@').first;
      final utilisateur = Utilisateur(
        id: const Uuid().v4(),
        nom: 'Utilisateur',
        prenom: prenom.isEmpty ? 'Jean' : prenom[0].toUpperCase() + prenom.substring(1),
        email: email,
      );
      return _persisterSessionSimulee(utilisateur);
    }

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
    if (kModeSimule) {
      final utilisateur = Utilisateur(
        id: const Uuid().v4(),
        nom: nom,
        prenom: prenom,
        email: email,
        telephone: telephone,
        permisConduire: permisConduire,
      );
      return _persisterSessionSimulee(utilisateur);
    }

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

  Future<Utilisateur> _persisterSessionSimulee(Utilisateur utilisateur) async {
    await _storage.sauvegarder(
      token: 'jeton-simule-${utilisateur.id}',
      userJson: jsonEncode(utilisateur.toJson()),
    );
    return utilisateur;
  }

  Future<void> deconnexion() => _storage.effacer();

  /// Édition de profil locale : aucun backend d'édition de profil n'existe
  /// pour l'instant, donc on persiste directement dans le stockage sécurisé
  /// du téléphone (survit aux redémarrages de l'app, contrairement à un
  /// simple changement d'état en mémoire).
  Future<Utilisateur> mettreAJourProfil(Utilisateur utilisateur) async {
    await _storage.sauvegarderUtilisateur(jsonEncode(utilisateur.toJson()));
    return utilisateur;
  }

  Future<Utilisateur> _persisterSession(Map<String, dynamic> data) async {
    final token = data['accessToken'] as String;
    final user = Utilisateur.fromJson(data['user'] as Map<String, dynamic>);
    await _storage.sauvegarder(token: token, userJson: jsonEncode(user.toJson()));
    return user;
  }
}
