import 'package:flutter/material.dart';

/// Forme du cadre de visée affiché par-dessus la caméra.
enum CadreVisee { aucun, plaque, document, vehicule }

/// Une étape de la capture guidée. L'identifiant combine la catégorie
/// transmise au backend et le conducteur concerné (`plaque_A`, `cni_B`…).
class EtapeCapture {
  const EtapeCapture({
    required this.categorie,
    this.conducteur,
    this.video = false,
    this.document = false,
    required this.icone,
    required this.cadre,
  });

  /// Catégorie côté backend (`plaque`, `vue_ensemble`, `carte_grise`…).
  final String categorie;

  /// 'A' ou 'B' pour les étapes propres à un conducteur.
  final String? conducteur;
  final bool video;

  /// Pièce justificative : peut être déclarée « Je n'ai pas ce document ».
  final bool document;
  final IconData icone;
  final CadreVisee cadre;

  String get id => conducteur == null ? categorie : '${categorie}_$conducteur';

  /// Clés de traduction : `capture_etape_<categorie>` et `capture_consigne_<categorie>`.
  String get cleTitre => 'capture_etape_$categorie';
  String get cleConsigne => 'capture_consigne_$categorie';
}

/// Durée imposée de la vidéo du tour des véhicules, en secondes.
const dureeVideoTourMin = 30;
const dureeVideoTourMax = 45;

const _documents = [
  ('carte_grise', Icons.badge_outlined),
  ('visite_technique', Icons.fact_check_outlined),
  ('assurance', Icons.verified_user_outlined),
  ('cni', Icons.perm_identity),
  ('permis', Icons.credit_card),
  ('autre_document', Icons.description_outlined),
];

/// Ordre de la capture guidée : la scène et les véhicules d'abord (avant que
/// les véhicules ne soient déplacés), puis les pièces de chaque conducteur,
/// et enfin la vidéo du tour.
final List<EtapeCapture> etapesCapture = [
  const EtapeCapture(categorie: 'vue_ensemble', icone: Icons.panorama_wide_angle_outlined, cadre: CadreVisee.aucun),
  for (final c in ['A', 'B']) ...[
    EtapeCapture(categorie: 'plaque', conducteur: c, icone: Icons.pin_outlined, cadre: CadreVisee.plaque),
    EtapeCapture(categorie: 'vehicule', conducteur: c, icone: Icons.directions_car_outlined, cadre: CadreVisee.vehicule),
  ],
  for (final c in ['A', 'B'])
    for (final (categorie, icone) in _documents)
      EtapeCapture(categorie: categorie, conducteur: c, document: true, icone: icone, cadre: CadreVisee.document),
  const EtapeCapture(categorie: 'video_tour', video: true, icone: Icons.videocam_outlined, cadre: CadreVisee.aucun),
];

/// Un média pris pendant la capture guidée.
class CaptureGuidee {
  const CaptureGuidee({
    required this.etape,
    required this.chemin,
    this.dureeSecondes,
  });

  final EtapeCapture etape;
  final String chemin;
  final double? dureeSecondes;
}
