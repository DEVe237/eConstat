/// Résultat de l'analyse IA des photos (POST /dossiers/{id}/analyse-ia).
/// Indicatif : il pré-remplit le formulaire, que le conducteur vérifie.
class AnalyseIa {
  const AnalyseIa({
    required this.statut,
    this.erreur,
    this.vehicules = const [],
    this.conditionsMeteo = 'inconnu',
    this.typeCollision = 'inconnu',
    this.angleImpactDeg = -1,
    this.resume = '',
    this.confiance = 0,
  });

  factory AnalyseIa.fromJson(Map<String, dynamic> json) {
    final r = json['resultat'] as Map<String, dynamic>?;
    return AnalyseIa(
      statut: json['statut'] as String? ?? 'echouee',
      erreur: json['erreur'] as String?,
      vehicules: [
        for (final v in (r?['vehicules'] as List? ?? const []))
          VehiculeAnalyse.fromJson(v as Map<String, dynamic>),
      ],
      conditionsMeteo: r?['conditionsMeteo'] as String? ?? 'inconnu',
      typeCollision: r?['typeCollision'] as String? ?? 'inconnu',
      angleImpactDeg: (r?['angleImpactDeg'] as num?)?.toInt() ?? -1,
      resume: r?['resume'] as String? ?? '',
      confiance: (r?['confiance'] as num?)?.toDouble() ?? 0,
    );
  }

  /// 'terminee', 'echouee' ou 'indisponible' (aucune clé d'API côté serveur).
  final String statut;
  final String? erreur;
  final List<VehiculeAnalyse> vehicules;
  final String conditionsMeteo;
  final String typeCollision;
  final int angleImpactDeg;
  final String resume;
  final double confiance;

  bool get reussie => statut == 'terminee';

  VehiculeAnalyse? vehicule(String conducteur) {
    for (final v in vehicules) {
      if (v.conducteur == conducteur) return v;
    }
    return null;
  }
}

class VehiculeAnalyse {
  const VehiculeAnalyse({
    required this.conducteur,
    this.plaque = '',
    this.marque = '',
    this.couleur = '',
    this.zoneChoc = 'inconnue',
    this.degats = '',
    this.gravite = 'inconnue',
  });

  factory VehiculeAnalyse.fromJson(Map<String, dynamic> json) => VehiculeAnalyse(
        conducteur: json['conducteur'] as String? ?? 'A',
        plaque: json['plaque'] as String? ?? '',
        marque: json['marque'] as String? ?? '',
        couleur: json['couleur'] as String? ?? '',
        zoneChoc: json['zoneChoc'] as String? ?? 'inconnue',
        degats: json['degats'] as String? ?? '',
        gravite: json['gravite'] as String? ?? 'inconnue',
      );

  final String conducteur;
  final String plaque;
  final String marque;
  final String couleur;
  final String zoneChoc;
  final String degats;
  final String gravite;
}
