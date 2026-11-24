import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Préférence de thème (Système/Clair/Sombre), pilotée depuis Paramètres.
/// Reste en mémoire pour la session en cours (pas encore persistée entre
/// deux lancements de l'app — mode design, pas de dépendance de stockage
/// supplémentaire ajoutée pour ça pour l'instant).
class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => ThemeMode.system;

  void definir(ThemeMode mode) => state = mode;
}

final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);
