/// Suivi d'une génération de reconstitution 3D (cahier de conception §7.1 —
/// entité Simulation3D).
class Simulation3D {
  const Simulation3D({
    required this.id,
    required this.dossierId,
    required this.statut,
    this.urlAnimation,
    this.erreur,
    this.sceneUrl,
  });

  factory Simulation3D.fromJson(Map<String, dynamic> json) {
    return Simulation3D(
      id: json['id'] as String,
      dossierId: json['dossierId'] as String,
      statut: json['statut'] as String? ?? 'en_attente',
      urlAnimation: json['urlAnimation'] as String?,
      erreur: json['erreur'] as String?,
      sceneUrl: json['sceneUrl'] as String?,
    );
  }

  final String id;
  final String dossierId;
  final String statut;
  final String? urlAnimation;
  final String? erreur;

  /// Lien signé (relatif à l'API) vers la visionneuse 3D interactive.
  final String? sceneUrl;

  bool get enCours => statut == 'en_attente' || statut == 'en_cours';
  bool get terminee => statut == 'termine' && urlAnimation != null;
  bool get echouee => statut == 'echec';

  Simulation3D copyWith({
    String? id,
    String? dossierId,
    String? statut,
    String? urlAnimation,
    String? erreur,
    String? sceneUrl,
  }) {
    return Simulation3D(
      id: id ?? this.id,
      dossierId: dossierId ?? this.dossierId,
      statut: statut ?? this.statut,
      urlAnimation: urlAnimation ?? this.urlAnimation,
      erreur: erreur ?? this.erreur,
      sceneUrl: sceneUrl ?? this.sceneUrl,
    );
  }
}
