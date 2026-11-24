// Parcours complet du code mobile contre une vraie API de DÉVELOPPEMENT (crée un
// compte et un dossier de test). Ignoré par défaut :
//   flutter test test/api_reelle_test.dart --dart-define=API_REELLE=true --dart-define=FFMPEG=chemin/ffmpeg
import 'dart:convert';
import 'dart:io';

import 'package:camaircost/core/network/api_client.dart';
import 'package:camaircost/core/network/erreurs.dart';
import 'package:camaircost/core/network/token_storage.dart';
import 'package:camaircost/data/repositories/auth_repository.dart';
import 'package:camaircost/data/repositories/dossiers_repository.dart';
import 'package:camaircost/data/repositories/simulation3d_repository.dart';
import 'package:camaircost/domain/entities/capture_guidee.dart';
import 'package:camaircost/domain/entities/constat_draft.dart';
import 'package:camaircost/domain/entities/vehicule_implique.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

const _actif = bool.fromEnvironment('API_REELLE');
const _ffmpeg = String.fromEnvironment('FFMPEG', defaultValue: 'ffmpeg');

/// Le stockage sécurisé du téléphone n'existe pas pendant un test.
class _Memoire implements TokenStorage {
  String? token;
  String? user;

  @override
  Future<String?> lireToken() async => token;
  @override
  Future<String?> lireUtilisateurJson() async => user;
  @override
  Future<void> sauvegarder({required String token, required String userJson}) async {
    this.token = token;
    user = userJson;
  }

  @override
  Future<void> sauvegarderUtilisateur(String userJson) async => user = userJson;
  @override
  Future<void> effacer() async => token = user = null;
}

void main() {
  test('le code mobile dialogue avec la vraie API', () async {
    final dir = Directory.systemTemp.createTempSync('econstat');
    addTearDown(() => dir.deleteSync(recursive: true));
    Future<String> ffmpeg(String nom, List<String> args) async {
      final f = '${dir.path}/$nom';
      final r = await Process.run(_ffmpeg, ['-y', '-loglevel', 'error', ...args, f]);
      expect(r.exitCode, 0, reason: '${r.stderr}');
      return f;
    }

    final photo = await ffmpeg('p.jpg', ['-f', 'lavfi', '-i', 'color=c=red:s=640x480', '-frames:v', '1']);
    final reprise = await ffmpeg('p2.jpg', ['-f', 'lavfi', '-i', 'color=c=blue:s=640x480', '-frames:v', '1']);
    final video = await ffmpeg('v.mp4', ['-f', 'lavfi', '-i', 'color=c=gray:s=64x48:r=10:d=36', '-pix_fmt', 'yuv420p']);
    final png = base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

    final stockage = _Memoire();
    final api = ApiClient(tokenStorage: stockage);
    final auth = AuthRepository(api, stockage);
    final dossiers = DossiersRepository(api);
    final sim = Simulation3dRepository(api);
    final stamp = DateTime.now().millisecondsSinceEpoch;
    final email = 'mobile.$stamp@test.local';

    // Compte
    final user = await auth.inscription(nom: 'Fotso', prenom: 'Aline', email: email, motDePasse: 'Ancien-$stamp');
    expect(user.role, 'usager');
    expect((await auth.utilisateurConnecte())?.email, email);
    final profil = await auth.mettreAJourProfil(user.copyWith(telephone: '699001122', adresse: 'Yaoundé', assurance: 'Contrat 1'));
    expect((profil.telephone, profil.adresse, profil.assurance), ('699001122', 'Yaoundé', 'Contrat 1'));
    try {
      await auth.changerMotDePasse(actuel: 'faux-mot-de-passe', nouveau: 'Nouveau-$stamp');
      fail('un mauvais mot de passe actuel doit être refusé');
    } on DioException catch (e) {
      expect(messageServeur(e), contains('incorrect'));
    }
    await auth.changerMotDePasse(actuel: 'Ancien-$stamp', nouveau: 'Nouveau-$stamp');
    await auth.deconnexion();
    expect(await auth.utilisateurConnecte(), isNull);
    final reconnecte = await auth.connexion(email: email, motDePasse: 'Nouveau-$stamp');
    expect(reconnecte.adresse, 'Yaoundé');
    expect(await dossiers.listerDossiers(), isEmpty);

    // Capture guidée : toutes les étapes, deux documents photographiés, le reste absent.
    final captures = <String, CaptureGuidee>{};
    final absents = <String>{};
    for (final e in etapesCapture) {
      if (e.document && e.id != 'cni_A' && e.id != 'permis_B') {
        absents.add(e.id);
      } else {
        captures[e.id] = CaptureGuidee(etape: e, chemin: e.video ? video : photo, dureeSecondes: e.video ? 36 : null);
      }
    }
    var draft = ConstatDraft(captures: captures, documentsAbsents: absents, latitude: 3.8667, longitude: 11.5167, dateAccident: DateTime.now().toUtc());
    expect(draft.captureComplete, isTrue);

    final envoyees = <String, String>{};
    final etapes = <int>[];
    final id = await dossiers.preparerBrouillon(
      draft,
      progression: (n, _) => etapes.add(n),
      surEnvoi: (c) => envoyees[c.etape.id] = c.chemin,
    );
    expect(envoyees.length, captures.length);
    expect(etapes.last, captures.length);

    // Reprise après coupure : même dossier, seule la photo refaite repart.
    captures['plaque_A'] = CaptureGuidee(etape: captures['plaque_A']!.etape, chemin: reprise);
    draft = draft.copyWith(dossierId: id, captures: captures, envoyees: envoyees);
    final renvoyees = <String>[];
    expect(await dossiers.preparerBrouillon(draft, surEnvoi: (c) => renvoyees.add(c.etape.id)), id);
    expect(renvoyees, ['plaque_A']);

    final analyse = await dossiers.analyserPhotos(id);
    expect(['terminee', 'echouee', 'indisponible'], contains(analyse.statut));

    // Dossier incomplet : le serveur explique ce qui manque.
    try {
      await dossiers.envoyerConstat(draft.copyWith(vehicules: const [VehiculeImplique(conducteurNom: 'Aline Fotso', plaque: 'CE-1-AA')]));
      fail('un dossier incomplet doit être refusé');
    } on DioException catch (e) {
      expect(messageServeur(e), contains('incomplet'));
    }

    // Formulaire, signatures, transmission.
    final envoye = await dossiers.envoyerConstat(draft.copyWith(
      conditionsMeteo: 'meteo_pluie',
      vehicules: const [
        VehiculeImplique(conducteurNom: 'Aline Fotso', plaque: 'CE-1-AA', marque: 'Toyota', sensCirculation: 'tout_droit', zoneChoc: 'avant'),
        VehiculeImplique(conducteurNom: 'Eric Kamga', plaque: 'LT-2-BB', marque: 'Kia', sensCirculation: 'gauche', zoneChoc: 'flanc_gauche'),
      ],
      signatures: {'Aline Fotso': png, 'Eric Kamga': png},
    ));
    expect((envoye.id, envoye.statut), (id, 'transmis'));
    expect(envoye.hashIntegrite.length, 64);

    final liste = await dossiers.listerDossiers();
    expect(liste.length, 1);
    expect(liste.first['vehiculesImpliques'], hasLength(2));

    // Écran de détail : contenu et photos par lien signé.
    final detail = await dossiers.detail(id);
    expect(detail['statut'], 'transmis');
    expect((detail['vehiculesImpliques'] as List).first['plaque'], 'CE-1-AA');
    final premiere = (detail['medias'] as List).firstWhere((m) => m['type'] == 'photo');
    expect((await Dio().get<List<int>>('${api.dio.options.baseUrl}${premiere['url']}', options: Options(responseType: ResponseType.bytes))).statusCode, 200);

    // Reconstitution 3D : la page que la WebView ouvre et les données qu'elle charge.
    final generation = await sim.declencherGeneration(id);
    expect(generation.sceneUrl, isNotNull);
    expect((await sim.obtenirStatut(id))?.dossierId, id);
    final base = api.dio.options.baseUrl;
    final nu = Dio();
    expect((await nu.get<String>('$base${generation.sceneUrl}')).data, contains('scene-builder.js'));
    final q = Uri.parse('$base${generation.sceneUrl}').queryParameters;
    final scene = await nu.get<Map<String, dynamic>>('$base/dossiers/$id/simulation3d/scene', queryParameters: {'exp': q['exp'], 'sig': q['sig']});
    expect(scene.data!['vehicules'], hasLength(2));
    expect(scene.data!['meteo'], 'meteo_pluie');

    // ignore: avoid_print
    print('DOSSIER=$id');
  }, skip: _actif ? false : 'API réelle non demandée', timeout: const Timeout(Duration(minutes: 5)));
}
