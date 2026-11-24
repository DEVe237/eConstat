class Utilisateur {
  const Utilisateur({
    required this.id,
    required this.nom,
    required this.prenom,
    required this.email,
    this.telephone,
    this.permisConduire,
    this.adresse,
    this.assurance,
    this.role = 'usager',
  });

  factory Utilisateur.fromJson(Map<String, dynamic> json) {
    return Utilisateur(
      id: json['id'] as String,
      nom: json['nom'] as String,
      prenom: json['prenom'] as String,
      email: json['email'] as String,
      telephone: json['telephone'] as String?,
      permisConduire: json['permisConduire'] as String?,
      adresse: json['adresse'] as String?,
      assurance: json['assurance'] as String?,
      role: json['role'] as String? ?? 'usager',
    );
  }

  final String id;
  final String nom;
  final String prenom;
  final String email;
  final String? telephone;
  final String? permisConduire;
  final String? adresse;
  final String? assurance;
  final String role;

  Utilisateur copyWith({
    String? nom,
    String? prenom,
    String? email,
    String? telephone,
    String? permisConduire,
    String? adresse,
    String? assurance,
  }) {
    return Utilisateur(
      id: id,
      nom: nom ?? this.nom,
      prenom: prenom ?? this.prenom,
      email: email ?? this.email,
      telephone: telephone ?? this.telephone,
      permisConduire: permisConduire ?? this.permisConduire,
      adresse: adresse ?? this.adresse,
      assurance: assurance ?? this.assurance,
      role: role,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nom': nom,
        'prenom': prenom,
        'email': email,
        'telephone': telephone,
        'permisConduire': permisConduire,
        'adresse': adresse,
        'assurance': assurance,
        'role': role,
      };
}
