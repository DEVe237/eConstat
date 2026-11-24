import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/token_storage.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/dossiers_repository.dart';
import '../../data/repositories/simulation3d_repository.dart';
import 'auth_notifier.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(tokenStorage: ref.watch(tokenStorageProvider)),
);

final dossiersRepositoryProvider = Provider<DossiersRepository>(
  (ref) => DossiersRepository(ref.watch(apiClientProvider)),
);

final simulation3dRepositoryProvider = Provider<Simulation3dRepository>(
  (ref) => Simulation3dRepository(ref.watch(apiClientProvider)),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(tokenStorageProvider),
  ),
);

/// Rechargé à chaque changement de compte : un conducteur ne voit jamais la
/// liste en mémoire du précédent.
final historiqueProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final id = ref.watch(authNotifierProvider.select((u) => u.value?.id));
  if (id == null) return const [];
  return ref.watch(dossiersRepositoryProvider).listerDossiers();
});
