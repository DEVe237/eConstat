import 'dart:async';

import 'package:camaircost/core/i18n/app_strings.dart';
import 'package:camaircost/core/theme/app_theme.dart';
import 'package:camaircost/domain/entities/utilisateur.dart';
import 'package:camaircost/presentation/screens/historique/dossier_detail_screen.dart';
import 'package:camaircost/presentation/screens/historique/historique_screen.dart';
import 'package:camaircost/presentation/screens/home/home_screen.dart';
import 'package:camaircost/presentation/screens/notifications/notifications_screen.dart';
import 'package:camaircost/presentation/screens/profile/edit_profile_screen.dart';
import 'package:camaircost/presentation/screens/profile/profile_screen.dart';
import 'package:camaircost/presentation/state/api_providers.dart';
import 'package:camaircost/presentation/state/auth_notifier.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _Auth extends AuthNotifier {
  _Auth(this.user);

  final Utilisateur? user;

  @override
  Future<Utilisateur?> build() async => user;
}

const _nouveau = Utilisateur(id: '1', nom: 'Fotso', prenom: 'Aline', email: 'aline@test.local');

Future<void> _afficher(
  WidgetTester tester,
  Widget ecran, {
  Utilisateur? user = _nouveau,
  Future<List<Map<String, dynamic>>> Function()? dossiers,
  Map<String, dynamic> detail = const {},
}) async {
  tester.view.physicalSize = const Size(1200, 4000);
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authNotifierProvider.overrideWith(() => _Auth(user)),
        historiqueProvider.overrideWith((ref) => dossiers?.call() ?? Future.value(const [])),
        dossierDetailProvider.overrideWith((ref, id) async => detail),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        builder: (_, child) => AppStrings(langue: 'fr', child: child!),
        home: ecran,
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
}

void main() {
  testWidgets('accueil d\'un nouveau compte : aucun chiffre inventé', (tester) async {
    await _afficher(tester, const HomeScreen());
    expect(find.text('Bonjour, Aline'), findsOneWidget);
    expect(find.text('0'), findsNWidgets(2));
    expect(find.textContaining('4829'), findsNothing);
    expect(find.textContaining('européen'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('accueil sans réponse du serveur : tirets', (tester) async {
    await _afficher(tester, const HomeScreen(), dossiers: () => Completer<List<Map<String, dynamic>>>().future);
    expect(find.text('—'), findsNWidgets(2));
    expect(tester.takeException(), isNull);
  });

  testWidgets('accueil sans utilisateur chargé', (tester) async {
    await _afficher(tester, const HomeScreen(), user: null);
    expect(find.text('Bonjour'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('profil vide : « Non renseigné », pas de faux permis', (tester) async {
    await _afficher(tester, const ProfileScreen());
    expect(find.text('Aline Fotso'), findsOneWidget);
    expect(find.text('Non renseigné'), findsNWidgets(4));
    expect(tester.takeException(), isNull);
  });

  testWidgets('modification du profil : adresse vide au départ', (tester) async {
    await _afficher(tester, const EditProfileScreen());
    expect(find.textContaining('République'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  const args = DossierDetailArgs(
    dossierId: '6687ea50-783f-40a8-af61-6233a853449f',
    titre: 'Dossier',
    date: '',
    statut: 'Validé',
    statutColor: Colors.green,
    plaque: '—',
  );

  testWidgets('détail : conclusion, justification et pièces', (tester) async {
    await _afficher(
      tester,
      const DossierDetailScreen(args: args),
      detail: {
        'statut': 'valide',
        'responsabilite': 'partagee',
        'partResponsabiliteA': 70,
        'commentaireAgent': 'Excès de vitesse constaté.',
        'conditionsMeteo': 'meteo_pluie',
        'vehiculesImpliques': [
          {'conducteurNom': 'Aline', 'plaque': 'CE-1-AA', 'marque': null, 'zoneChoc': 'flanc_gauche'},
        ],
        'medias': [
          {'type': 'photo', 'categorie': 'cni', 'conducteur': 'A', 'url': '/x'},
          {'type': 'video', 'categorie': 'video_tour', 'dureeSecondes': 35.7, 'url': '/v'},
        ],
        'documentsAbsents': [
          {'conducteur': 'B', 'categorie': 'permis'},
        ],
        'signatures': [
          {'conducteurNom': 'Aline'},
        ],
      },
    );
    expect(find.text('Responsabilité partagée : A 70 %, B 30 %'), findsOneWidget);
    expect(find.text('Excès de vitesse constaté.'), findsOneWidget);
    expect(find.text('Flanc gauche'), findsOneWidget);
    expect(find.text('Fournie'), findsOneWidget);
    expect(find.text('Non détenue'), findsOneWidget);
    expect(find.text('36 s'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('détail : dossier sans aucune donnée', (tester) async {
    await _afficher(tester, const DossierDetailScreen(args: args), detail: const {'statut': 'brouillon'});
    expect(find.text('Conclusion de l’autorité'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('historique et notifications vides', (tester) async {
    await _afficher(tester, const HistoriqueScreen());
    expect(tester.takeException(), isNull);
    await _afficher(tester, const NotificationsScreen());
    expect(find.text('Aucune notification'), findsOneWidget);
  });
}
