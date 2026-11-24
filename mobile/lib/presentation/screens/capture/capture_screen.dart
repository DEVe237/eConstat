import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/entities/capture_guidee.dart';
import '../../state/constat_draft_notifier.dart';
import '../../widgets/responsive_utils.dart';

/// Capture guidée : l'application demande, une par une, les photos dont le
/// dossier a besoin (vue d'ensemble, plaques et véhicules A et B, pièces de
/// chaque conducteur), puis une vidéo du tour de 30 à 45 secondes. Chaque
/// pièce justificative peut être déclarée « Je n'ai pas ce document ».
/// Le formulaire vient ensuite, pré-rempli par l'analyse IA des photos.
class CaptureScreen extends ConsumerStatefulWidget {
  const CaptureScreen({super.key});

  @override
  ConsumerState<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends ConsumerState<CaptureScreen> {
  List<CameraDescription> _cameras = [];
  CameraController? _controller;
  int _cameraIndex = 0;
  String? _erreurCamera;

  int _etapeIndex = 0;
  bool _prisEnCours = false;
  bool _enregistrementEnCours = false;
  Timer? _chrono;
  int _secondes = 0;
  final _listeEtapes = ScrollController();

  bool _localisationEnCours = false;
  String? _erreurLocalisation;

  EtapeCapture get _etape => etapesCapture[_etapeIndex];

  @override
  void initState() {
    super.initState();
    // Reprend là où le conducteur s'était arrêté.
    final draft = ref.read(constatDraftProvider);
    final premiere = etapesCapture.indexWhere((e) => !draft.etapeFaite(e));
    _etapeIndex = premiere < 0 ? 0 : premiere;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!draft.aLocalisation) _capturerLocalisation();
      _defilerVersEtape();
    });
    _initialiserCamera();
  }

  @override
  void dispose() {
    _chrono?.cancel();
    _listeEtapes.dispose();
    final controller = _controller;
    if (controller != null && controller.value.isRecordingVideo) {
      controller.stopVideoRecording().whenComplete(controller.dispose);
    } else {
      controller?.dispose();
    }
    super.dispose();
  }

  Future<void> _initialiserCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) throw Exception('no_camera');
      await _demarrerControleur(_cameras[_cameraIndex]);
    } on CameraException catch (e) {
      if (mounted) {
        setState(() {
          _erreurCamera = (e.description != null && e.description!.isNotEmpty) ? e.description : e.code;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _erreurCamera = e.toString().contains('no_camera') ? '_aucune_camera_' : e.toString();
        });
      }
    }
  }

  Future<void> _demarrerControleur(CameraDescription description) async {
    final ancien = _controller;
    // Haute résolution pour que les plaques et les documents restent lisibles.
    final nouveau = CameraController(description, ResolutionPreset.high, enableAudio: false);
    await nouveau.initialize();
    if (!mounted) {
      await nouveau.dispose();
      return;
    }
    setState(() {
      _controller = nouveau;
      _erreurCamera = null;
      _enregistrementEnCours = false;
    });
    await ancien?.dispose();
  }

  Future<void> _basculerCamera() async {
    if (_cameras.length < 2 || _enregistrementEnCours) return;
    _cameraIndex = (_cameraIndex + 1) % _cameras.length;
    await _demarrerControleur(_cameras[_cameraIndex]);
  }

  Future<void> _capturerLocalisation() async {
    setState(() {
      _localisationEnCours = true;
      _erreurLocalisation = null;
    });
    try {
      final permission = await Geolocator.checkPermission();
      var permissionAccordee = permission == LocationPermission.always || permission == LocationPermission.whileInUse;
      if (!permissionAccordee) {
        final demandee = await Geolocator.requestPermission();
        permissionAccordee = demandee == LocationPermission.always || demandee == LocationPermission.whileInUse;
      }
      if (!permissionAccordee) throw Exception('Permission de localisation refusée');
      final position = await Geolocator.getCurrentPosition();
      ref.read(constatDraftProvider.notifier).setLocalisation(latitude: position.latitude, longitude: position.longitude);
    } catch (e) {
      if (mounted) setState(() => _erreurLocalisation = e.toString());
    } finally {
      if (mounted) setState(() => _localisationEnCours = false);
    }
  }

  void _allerA(int index) {
    if (_enregistrementEnCours) return;
    setState(() => _etapeIndex = index);
    _defilerVersEtape();
  }

  void _defilerVersEtape() {
    if (!_listeEtapes.hasClients) return;
    final cible = (_etapeIndex * 64.0 - 120).clamp(0.0, _listeEtapes.position.maxScrollExtent);
    _listeEtapes.animateTo(cible, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  /// Passe à la prochaine étape non faite (après l'étape courante, sinon depuis le début).
  void _etapeSuivante() {
    final draft = ref.read(constatDraftProvider);
    for (var i = 1; i <= etapesCapture.length; i++) {
      final index = (_etapeIndex + i) % etapesCapture.length;
      if (!draft.etapeFaite(etapesCapture[index])) return _allerA(index);
    }
    setState(() {});
  }

  Future<void> _declencher() async {
    if (_etape.video) return _basculerEnregistrementVideo();
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _prisEnCours) return;
    setState(() => _prisEnCours = true);
    try {
      final photo = await controller.takePicture();
      ref.read(constatDraftProvider.notifier).setCapture(_etape, photo.path);
      _etapeSuivante();
    } on CameraException catch (e) {
      _message(e.description ?? e.code);
    } finally {
      if (mounted) setState(() => _prisEnCours = false);
    }
  }

  Future<void> _basculerEnregistrementVideo() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      if (controller.value.isRecordingVideo) {
        await _arreterVideo();
      } else {
        await controller.startVideoRecording();
        _secondes = 0;
        _chrono = Timer.periodic(const Duration(seconds: 1), (_) {
          if (!mounted) return;
          setState(() => _secondes++);
          // Arrêt automatique à la durée maximale.
          if (_secondes >= dureeVideoTourMax) _arreterVideo();
        });
      }
    } on CameraException catch (e) {
      if (!mounted) return;
      _message(AppStrings.of(context).t('capture_erreur_video').replaceFirst('%s', '${e.description}'));
    } finally {
      if (mounted) setState(() => _enregistrementEnCours = controller.value.isRecordingVideo);
    }
  }

  Future<void> _arreterVideo() async {
    final controller = _controller;
    _chrono?.cancel();
    _chrono = null;
    if (controller == null || !controller.value.isRecordingVideo) return;
    final video = await controller.stopVideoRecording();
    final duree = _secondes;
    if (!mounted) return;
    setState(() => _enregistrementEnCours = false);
    if (duree < dureeVideoTourMin) {
      // Trop courte : le serveur la refuserait. On la jette et on recommence.
      File(video.path).delete().ignore();
      _message(AppStrings.of(context).t('capture_video_trop_courte').replaceFirst('%s', '$dureeVideoTourMin'));
      return;
    }
    ref.read(constatDraftProvider.notifier).setCapture(_etape, video.path, dureeSecondes: duree.toDouble());
    _etapeSuivante();
  }

  void _documentAbsent() {
    ref.read(constatDraftProvider.notifier).marquerDocumentAbsent(_etape);
    _etapeSuivante();
  }

  void _message(String texte) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(texte)));
  }

  String _titreEtape(String Function(String) t, EtapeCapture e) {
    final titre = t(e.cleTitre);
    return e.conducteur == null ? titre : '$titre · ${t('capture_conducteur').replaceFirst('%s', e.conducteur!)}';
  }

  @override
  Widget build(BuildContext context) {
    final s = responsiveScale(context);
    final t = AppStrings.of(context).t;
    final draft = ref.watch(constatDraftProvider);
    final controller = _controller;
    final etape = _etape;
    final capture = draft.captures[etape.id];
    final absent = draft.documentsAbsents.contains(etape.id);
    final faites = etapesCapture.where(draft.etapeFaite).length;
    final complet = faites == etapesCapture.length;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (controller != null && controller.value.isInitialized)
            Positioned.fill(child: ColoredBox(color: Colors.black, child: CameraPreview(controller)))
          else if (_erreurCamera != null)
            _ErreurCamera(message: _erreurCamera!)
          else
            const Center(child: CircularProgressIndicator(color: Colors.white)),
          Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: _CadrePainter(etape.cadre)))),

          // En-tête : retour, progression, bouton « Continuer ».
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Container(
                padding: EdgeInsets.fromLTRB(8 * s, 6 * s, 12 * s, 10 * s),
                color: Colors.white.withValues(alpha: 0.94),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        _RoundIconButton(icon: Icons.arrow_back, onTap: () => Navigator.pop(context)),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t('capture_etape_n').replaceFirst('%s', '${_etapeIndex + 1}').replaceFirst('%s', '${etapesCapture.length}'),
                                style: const TextStyle(color: Color(0xFF505A6B), fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              Text(
                                _titreEtape(t, etape),
                                style: const TextStyle(color: AppTheme.accent, fontWeight: FontWeight.w800, fontSize: 17, height: 1.15),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: complet && !_enregistrementEnCours ? () => Navigator.pushNamed(context, AppRoutes.analyse) : null,
                          style: TextButton.styleFrom(
                            backgroundColor: complet ? AppTheme.accent : const Color(0xFFE4E4E7),
                            foregroundColor: Colors.white,
                            disabledForegroundColor: const Color(0xFF71717A),
                            padding: EdgeInsets.symmetric(horizontal: 14 * s, vertical: 8 * s),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                          ),
                          child: Text(complet ? t('capture_continuer') : '$faites/${etapesCapture.length}'),
                        ),
                      ],
                    ),
                    SizedBox(height: 6 * s),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: faites / etapesCapture.length,
                        minHeight: 5,
                        backgroundColor: const Color(0xFFE4E4E7),
                        color: AppTheme.accent,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          if (!draft.aLocalisation || _localisationEnCours)
            Positioned(
              top: 104 * s,
              left: 14 * s,
              child: _BadgeGps(
                enCours: _localisationEnCours,
                aLocalisation: draft.aLocalisation,
                erreur: _erreurLocalisation,
                latitude: draft.latitude,
                longitude: draft.longitude,
                onRefresh: _capturerLocalisation,
              ),
            ),

          if (_enregistrementEnCours)
            Positioned(
              top: 110 * s,
              right: 14 * s,
              child: _ChronoVideo(secondes: _secondes),
            ),

          // Bas : liste des étapes, consigne, déclencheur.
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              padding: EdgeInsets.only(top: 18 * s, bottom: 10 * s),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black.withValues(alpha: 0.9)],
                ),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      height: 64 * s,
                      child: ListView.builder(
                        controller: _listeEtapes,
                        scrollDirection: Axis.horizontal,
                        padding: EdgeInsets.symmetric(horizontal: 12 * s),
                        itemCount: etapesCapture.length,
                        itemBuilder: (_, i) => _PuceEtape(
                          etape: etapesCapture[i],
                          active: i == _etapeIndex,
                          faite: draft.etapeFaite(etapesCapture[i]),
                          absente: draft.documentsAbsents.contains(etapesCapture[i].id),
                          onTap: () => _allerA(i),
                        ),
                      ),
                    ),
                    SizedBox(height: 10 * s),
                    Container(
                      margin: EdgeInsets.symmetric(horizontal: 16 * s),
                      width: double.infinity,
                      padding: EdgeInsets.symmetric(horizontal: 16 * s, vertical: 12 * s),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(20 * s),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
                      ),
                      child: Text(
                        absent
                            ? t('capture_doc_absent_info')
                            : etape.video
                                ? t(etape.cleConsigne).replaceFirst('%s', '$dureeVideoTourMin').replaceFirst('%s', '$dureeVideoTourMax')
                                : t(etape.cleConsigne),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600, height: 1.3),
                      ),
                    ),
                    SizedBox(height: 14 * s),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 22 * s),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _ApercuCapture(chemin: etape.video ? null : capture?.chemin, video: etape.video && capture != null, absent: absent),
                          _BoutonDeclencheur(
                            modeVideo: etape.video,
                            enregistrementEnCours: _enregistrementEnCours,
                            onTap: _declencher,
                          ),
                          _FlipCircleButton(onTap: _basculerCamera, active: _cameras.length > 1 && !_enregistrementEnCours),
                        ],
                      ),
                    ),
                    if (etape.document) ...[
                      SizedBox(height: 8 * s),
                      absent
                          ? TextButton.icon(
                              onPressed: () => ref.read(constatDraftProvider.notifier).annulerDocumentAbsent(etape),
                              icon: const Icon(Icons.undo, color: Colors.white70, size: 18),
                              label: Text(t('capture_annuler_absent'), style: const TextStyle(color: Colors.white70)),
                            )
                          : OutlinedButton.icon(
                              onPressed: _documentAbsent,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: BorderSide(color: Colors.white.withValues(alpha: 0.6)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                              ),
                              icon: const Icon(Icons.block, size: 18),
                              label: Text(t('capture_pas_ce_doc')),
                            ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Puce d'une étape dans la liste horizontale (icône, conducteur, état).
class _PuceEtape extends StatelessWidget {
  const _PuceEtape({required this.etape, required this.active, required this.faite, required this.absente, required this.onTap});

  final EtapeCapture etape;
  final bool active;
  final bool faite;
  final bool absente;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = responsiveScale(context);
    final fond = active
        ? AppTheme.accent
        : faite
            ? (absente ? const Color(0xFF7F1D1D) : const Color(0xFF065F46))
            : Colors.white.withValues(alpha: 0.16);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 56 * s,
        margin: EdgeInsets.symmetric(horizontal: 4 * s),
        decoration: BoxDecoration(
          color: fond,
          borderRadius: BorderRadius.circular(16 * s),
          border: Border.all(color: active ? Colors.white : Colors.transparent, width: 2),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(etape.icone, color: Colors.white, size: 24 * s),
            if (etape.conducteur != null)
              Positioned(
                left: 5 * s,
                top: 3 * s,
                child: Text(etape.conducteur!, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
              ),
            if (faite)
              Positioned(
                right: 4 * s,
                bottom: 3 * s,
                child: Icon(absente ? Icons.block : Icons.check_circle, color: Colors.white, size: 14 * s),
              ),
          ],
        ),
      ),
    );
  }
}

/// Miniature du média déjà pris pour l'étape courante (le reprendre écrase l'ancien).
class _ApercuCapture extends StatelessWidget {
  const _ApercuCapture({required this.chemin, required this.video, required this.absent});

  final String? chemin;
  final bool video;
  final bool absent;

  @override
  Widget build(BuildContext context) {
    final s = responsiveScale(context);
    return Container(
      width: 66 * s,
      height: 66 * s,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(14 * s),
        border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
      ),
      child: chemin != null
          ? Image.file(File(chemin!), fit: BoxFit.cover)
          : Icon(
              absent ? Icons.block : (video ? Icons.check_circle : Icons.photo_outlined),
              color: Colors.white70,
              size: 28 * s,
            ),
    );
  }
}

class _ChronoVideo extends StatelessWidget {
  const _ChronoVideo({required this.secondes});

  final int secondes;

  @override
  Widget build(BuildContext context) {
    final t = AppStrings.of(context).t;
    final assez = secondes >= dureeVideoTourMin;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: assez ? const Color(0xFF065F46) : AppTheme.danger,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.fiber_manual_record, color: Colors.white, size: 14),
          const SizedBox(width: 6),
          Text(
            t('capture_video_chrono').replaceFirst('%s', '$secondes').replaceFirst('%s', '$dureeVideoTourMax'),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

/// Cadre de visée : bandeau pour les plaques, format carte pour les documents.
class _CadrePainter extends CustomPainter {
  _CadrePainter(this.cadre);

  final CadreVisee cadre;

  @override
  void paint(Canvas canvas, Size size) {
    if (cadre == CadreVisee.aucun) return;
    final largeur = size.width * (cadre == CadreVisee.vehicule ? 0.9 : 0.84);
    final ratio = switch (cadre) {
      CadreVisee.plaque => 4.6,
      CadreVisee.document => 1.58,
      _ => 1.5,
    };
    final hauteur = largeur / ratio;
    final rect = Rect.fromCenter(center: Offset(size.width / 2, size.height * 0.42), width: largeur, height: hauteur);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(14));
    // Assombrit l'extérieur du cadre.
    canvas.drawPath(
      Path.combine(PathOperation.difference, Path()..addRect(Offset.zero & size), Path()..addRRect(rrect)),
      Paint()..color = Colors.black.withValues(alpha: cadre == CadreVisee.vehicule ? 0.15 : 0.4),
    );
    canvas.drawRRect(
      rrect,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5,
    );
  }

  @override
  bool shouldRepaint(_CadrePainter old) => old.cadre != cadre;
}

class _ErreurCamera extends StatelessWidget {
  const _ErreurCamera({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.no_photography_outlined,
                color: Colors.white54,
                size: 48,
              ),
              const SizedBox(height: 12),
              Text(
                AppStrings.of(context)
                    .t('capture_camera_indisponible')
                    .replaceFirst(
                      '%s',
                      message == '_aucune_camera_'
                          ? AppStrings.of(context).t('capture_aucune_camera')
                          : message,
                    ),
                style: const TextStyle(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = _screenScale(context);
    return Material(
      color: Colors.transparent,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(8 * s),
          child: Icon(icon, color: const Color(0xFF505A6B), size: 26 * s),
        ),
      ),
    );
  }
}

class _BadgeGps extends StatelessWidget {
  const _BadgeGps({
    required this.enCours,
    required this.aLocalisation,
    required this.erreur,
    required this.latitude,
    required this.longitude,
    required this.onRefresh,
  });

  final bool enCours;
  final bool aLocalisation;
  final String? erreur;
  final double? latitude;
  final double? longitude;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final s = _screenScale(context);
    final t = AppStrings.of(context).t;
    final statut = enCours
        ? t('capture_gps_recherche')
        : aLocalisation
        ? t('capture_gps_fort')
        : t('capture_gps_faible');
    final couleur = enCours
        ? Colors.white70
        : aLocalisation
        ? const Color(0xFF45E28A)
        : AppTheme.danger;

    return GestureDetector(
      onTap: onRefresh,
      child: Container(
        constraints: BoxConstraints(maxWidth: 256 * s),
        padding: EdgeInsets.symmetric(horizontal: 13 * s, vertical: 11 * s),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.56),
          borderRadius: BorderRadius.circular(15 * s),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.gps_fixed, size: 17 * s, color: couleur),
            SizedBox(width: 8 * s),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  t('capture_gps_prefix').replaceFirst('%s', statut),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                SizedBox(height: 3 * s),
                Text(
                  aLocalisation
                      ? '${latitude!.toStringAsFixed(4)}° N, ${longitude!.toStringAsFixed(4)}° E'
                      : (erreur != null
                            ? t('capture_gps_indisponible')
                            : t('capture_gps_localisation')),
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BoutonDeclencheur extends StatelessWidget {
  const _BoutonDeclencheur({
    required this.modeVideo,
    required this.enregistrementEnCours,
    required this.onTap,
  });

  final bool modeVideo;
  final bool enregistrementEnCours;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final s = _screenScale(context);
    final couleurCentre = enregistrementEnCours
        ? AppTheme.danger
        : Colors.white;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 122 * s,
        height: 122 * s,
        padding: EdgeInsets.all(7 * s),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppTheme.accent, width: 7 * s),
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: AppTheme.accent.withValues(alpha: 0.28),
              blurRadius: 26,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: couleurCentre,
            shape: enregistrementEnCours ? BoxShape.rectangle : BoxShape.circle,
            borderRadius: enregistrementEnCours
                ? BorderRadius.circular(10 * s)
                : null,
          ),
          child: modeVideo && !enregistrementEnCours
              ? Center(
                  child: Container(
                    width: 34 * s,
                    height: 34 * s,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.transparent,
                    ),
                    child: Icon(
                      Icons.play_arrow,
                      color: AppTheme.accent,
                      size: 26 * s,
                    ),
                  ),
                )
              : null,
        ),
      ),
    );
  }
}

class _FlipCircleButton extends StatelessWidget {
  const _FlipCircleButton({required this.onTap, required this.active});

  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final s = _screenScale(context);
    return Opacity(
      opacity: active ? 1 : 0.45,
      child: GestureDetector(
        onTap: active ? onTap : null,
        child: Container(
          width: 66 * s,
          height: 66 * s,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.24)),
          ),
          child: const Icon(Icons.cameraswitch, color: Colors.white, size: 30),
        ),
      ),
    );
  }
}

double _screenScale(BuildContext context) => responsiveScale(context);
