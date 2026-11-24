class VehiculeImplique {
  const VehiculeImplique({
    this.plaque = '',
    this.marque = '',
    this.conducteurNom = '',
    this.vitesseEstimee = '30',
    this.sensCirculation = '',
    this.zoneChoc = '',
  });

  final String plaque;
  final String marque;
  final String conducteurNom;
  final String vitesseEstimee;
  final String sensCirculation;
  final String zoneChoc;

  VehiculeImplique copyWith({
    String? plaque,
    String? marque,
    String? conducteurNom,
    String? vitesseEstimee,
    String? sensCirculation,
    String? zoneChoc,
  }) {
    return VehiculeImplique(
      plaque: plaque ?? this.plaque,
      marque: marque ?? this.marque,
      conducteurNom: conducteurNom ?? this.conducteurNom,
      vitesseEstimee: vitesseEstimee ?? this.vitesseEstimee,
      sensCirculation: sensCirculation ?? this.sensCirculation,
      zoneChoc: zoneChoc ?? this.zoneChoc,
    );
  }
}
