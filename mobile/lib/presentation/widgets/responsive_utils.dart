import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Dimensions de référence utilisées pour calibrer l'échelle (iPhone 13/14
/// standard, 390x844). Sur un écran de cette taille, [responsiveScale]
/// renvoie exactement 1.0 : l'UI s'affiche à sa taille prévue, ni réduite ni
/// agrandie inutilement.
const double baseScreenWidth = 390;
const double baseScreenHeight = 844;

/// Facteur d'échelle à appliquer aux tailles fixes (paddings, polices,
/// icônes...) pour qu'elles restent lisibles sur un petit téléphone (ex.
/// iPhone SE) et bien proportionnées sur un grand téléphone, sans jamais
/// réduire un écran déjà à la bonne taille.
///
/// [_densite] resserre l'ensemble de l'UI : les tailles d'origine (calibrées
/// à `s = 1.0`) rendaient trop grand sur un téléphone réel (retour terrain
/// sur Pixel 6a), donc ce facteur ramène `s ≈ 1.0` à une densité plus
/// compacte plutôt que de retoucher chaque écran individuellement.
///
/// Le plancher (0.72) évite un texte illisible sur les très petits écrans ;
/// le plafond (0.95) évite un agrandissement excessif sur tablette (on
/// préfère alors contraindre la largeur du contenu, voir [MaxWidthBox]).
const double _densite = 0.78;

double responsiveScale(BuildContext context) =>
    scaleForSize(MediaQuery.sizeOf(context));

/// Version basée sur une [Size] plutôt que sur un [BuildContext], utile avec
/// un [LayoutBuilder] (ex. quand un clavier ou une barre de navigation
/// réduit l'espace réellement disponible plutôt que la taille de l'écran).
double scaleForSize(Size size) {
  final raw = math.min(
    size.width / baseScreenWidth,
    size.height / baseScreenHeight,
  );
  return (raw * _densite).clamp(0.72, 0.95);
}

/// Empêche un formulaire ou une liste de s'étirer sur toute la largeur d'une
/// tablette ou d'un grand écran : au-delà de [maxWidth], le contenu reste
/// centré à une largeur confortable à lire.
class MaxWidthBox extends StatelessWidget {
  const MaxWidthBox({super.key, required this.child, this.maxWidth = 480});

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}
