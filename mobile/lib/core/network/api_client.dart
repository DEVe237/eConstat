import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'token_storage.dart';

/// Client HTTP vers le backend NestJS (cahier de conception §5.2).
///
/// En dev sur appareil physique connecté en USB, `localhost` sur le
/// téléphone est redirigé vers la machine hôte via `adb reverse
/// tcp:3000 tcp:3000` — pas besoin de connaître l'IP locale du PC.
class ApiClient {
  ApiClient({String baseUrl = kApiUrl, TokenStorage? tokenStorage})
      : dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 30),
        )) {
    final storage = tokenStorage ?? TokenStorage();
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.lireToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  final Dio dio;
}
