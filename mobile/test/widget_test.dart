import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:camaircost/main.dart';

void main() {
  testWidgets('Affiche l\'écran d\'accueil avec le bouton nouveau constat',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: CamairCostApp()),
    );

    expect(find.text('Nouveau constat'), findsOneWidget);
    expect(find.text('Historique des constats'), findsOneWidget);
  });
}
