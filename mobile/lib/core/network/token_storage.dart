import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persistance sécurisée du token JWT et de l'utilisateur courant, pour
/// garder la session active entre deux lancements de l'app.
class TokenStorage {
  TokenStorage() : _storage = const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _cleToken = 'access_token';
  static const _cleUser = 'current_user';

  Future<String?> lireToken() => _storage.read(key: _cleToken);
  Future<String?> lireUtilisateurJson() => _storage.read(key: _cleUser);

  Future<void> sauvegarder({required String token, required String userJson}) async {
    await _storage.write(key: _cleToken, value: token);
    await _storage.write(key: _cleUser, value: userJson);
  }

  /// Met à jour uniquement l'utilisateur en cache (édition de profil), sans
  /// toucher au token déjà en place.
  Future<void> sauvegarderUtilisateur(String userJson) async {
    await _storage.write(key: _cleUser, value: userJson);
  }

  Future<void> effacer() async {
    await _storage.delete(key: _cleToken);
    await _storage.delete(key: _cleUser);
  }
}
