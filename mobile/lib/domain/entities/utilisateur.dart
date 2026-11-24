class Utilisateur {
  const Utilisateur({
    required this.id,
    required this.nom,
    required this.prenom,
    required this.email,
    this.telephone,
    this.permisConduire,
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
      role: json['role'] as String? ?? 'usager',
    );
  }

  final String id;
  final String nom;
  final String prenom;
  final String email;
  final String? telephone;
  final String? permisConduire;
  final String role;

  Utilisateur copyWith({
    String? nom,
    String? prenom,
    String? email,
    String? telephone,
    String? permisConduire,
  }) {
    return Utilisateur(
      id: id,
      nom: nom ?? this.nom,
      prenom: prenom ?? this.prenom,
      email: email ?? this.email,
      telephone: telephone ?? this.telephone,
      permisConduire: permisConduire ?? this.permisConduire,
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
        'role': role,
      };
}
