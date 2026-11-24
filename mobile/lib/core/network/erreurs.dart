import 'package:dio/dio.dart';

/// Explication donnée par le serveur (« Mot de passe actuel incorrect »…),
/// ou null si le serveur n'a pas répondu.
String? messageServeur(Object erreur) {
  if (erreur is! DioException) return null;
  final data = erreur.response?.data;
  final message = data is Map ? data['message'] : null;
  if (message is List) return message.join(', ');
  return message is String ? message : null;
}
