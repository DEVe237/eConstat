import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Langue préférée (nom affiché, ex. "Français"), pilotée depuis Paramètres
/// exactement comme [themeModeProvider] : sélection réactive, appliquée
/// immédiatement, valable pour la session en cours. Seul le français a du
/// contenu traduit dans l'app aujourd'hui — les autres langues restent
/// affichées comme "Bientôt disponible" tant que ce travail de traduction
/// n'a pas été fait sur chaque écran.
class LanguageNotifier extends Notifier<String> {
  @override
  String build() => 'Français';

  void definir(String langue) => state = langue;
}

final languageProvider = NotifierProvider<LanguageNotifier, String>(
  LanguageNotifier.new,
);
