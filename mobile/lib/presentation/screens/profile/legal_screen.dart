import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

class LegalSection {
  const LegalSection(this.titre, this.corps);

  final String titre;
  final String corps;
}

/// Écran générique de texte légal, réutilisé pour la politique de
/// confidentialité et les conditions d'utilisation — un seul écran, deux
/// contenus, plutôt que deux écrans quasi identiques. Le contenu est
/// structuré en sections titrées plutôt qu'un unique bloc de texte, pour
/// rester lisible malgré sa longueur.
class LegalScreen extends StatelessWidget {
  const LegalScreen({
    super.key,
    required this.title,
    required this.derniereMiseAJour,
    required this.sections,
  });

  final String title;
  final String derniereMiseAJour;
  final List<LegalSection> sections;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.page),
          children: [
            Text(
              'Dernière mise à jour : $derniereMiseAJour',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: AppSpacing.lg),
            for (final section in sections) ...[
              Text(section.titre, style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.xs),
              Text(
                section.corps,
                style: theme.textTheme.bodyLarge?.copyWith(height: 1.55),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ],
        ),
      ),
    );
  }
}

const politiqueConfidentialiteMiseAJour = 'Janvier 2026';

const politiqueConfidentialite = [
  LegalSection(
    '1. Introduction',
    "eConstat (« l'application », « nous ») propose un service de constat "
        "amiable d'accident automobile numérique, incluant la capture de "
        "photos, la saisie des informations des véhicules impliqués, la "
        "signature électronique et une reconstitution 3D indicative de "
        "l'accident. La présente politique décrit quelles données nous "
        "collectons, pourquoi, comment elles sont protégées, et les droits "
        "dont vous disposez sur celles-ci.",
  ),
  LegalSection(
    '2. Données que nous collectons',
    "Lors de la création de votre compte : nom, prénom, adresse email, "
        "numéro de téléphone et numéro de permis de conduire. Lors de la "
        "déclaration d'un accident : les informations des véhicules "
        "impliqués (plaque, marque, vitesse estimée, trajectoire), les "
        "photos et vidéos prises sur les lieux, la position géographique au "
        "moment de la déclaration (via la géolocalisation de votre "
        "téléphone), l'horodatage de l'accident, les conditions météo "
        "déclarées, et l'image de votre signature électronique. Nous "
        "collectons également des données techniques limitées (modèle "
        "d'appareil, version du système d'exploitation) utiles au "
        "diagnostic en cas d'incident technique.",
  ),
  LegalSection(
    '3. Pourquoi nous utilisons ces données',
    "Ces données servent exclusivement à constituer votre dossier de "
        "sinistre, à le transmettre à votre compagnie d'assurance et, le "
        "cas échéant, aux autorités compétentes, et à générer la "
        "reconstitution 3D indicative de l'accident à partir des positions "
        "et vitesses déclarées. La géolocalisation n'est utilisée que pour "
        "situer précisément le lieu de l'accident sur le constat ; elle "
        "n'est pas suivie en dehors du parcours de déclaration.",
  ),
  LegalSection(
    '4. Partage des données',
    "Vos données ne sont jamais revendues à des tiers à des fins "
        "commerciales ou publicitaires. Elles peuvent être partagées avec : "
        "votre compagnie d'assurance et celle de l'autre conducteur impliqué "
        "(dans le cadre du traitement normal d'un constat amiable), les "
        "autorités compétentes lorsque la loi l'exige, et nos prestataires "
        "techniques d'hébergement, strictement liés par un engagement de "
        "confidentialité et n'ayant pas le droit d'exploiter ces données "
        "pour leur propre compte.",
  ),
  LegalSection(
    '5. Durée de conservation',
    "Les données d'un dossier de constat sont conservées pendant toute la "
        "durée nécessaire à son traitement par les assureurs, puis "
        "archivées pendant la durée exigée par la réglementation applicable "
        "aux dossiers de sinistre automobile, avant suppression ou "
        "anonymisation. Les données de votre compte sont conservées tant "
        "que celui-ci reste actif.",
  ),
  LegalSection(
    '6. Sécurité',
    "Les échanges entre l'application et nos serveurs sont chiffrés. "
        "L'accès aux dossiers est restreint aux personnes autorisées "
        "(vous-même, les assureurs concernés, les autorités compétentes le "
        "cas échéant). Votre session reste active sur votre appareil grâce "
        "à un stockage sécurisé du téléphone, jamais en clair.",
  ),
  LegalSection(
    '7. Vos droits',
    "Conformément à la réglementation sur la protection des données "
        "personnelles, vous disposez d'un droit d'accès, de rectification, "
        "de suppression et de portabilité de vos données, ainsi que d'un "
        "droit d'opposition et de limitation du traitement dans les cas "
        "prévus par la loi. Vous pouvez exercer ces droits directement "
        "depuis Profil > Modifier le profil pour vos informations de "
        "compte, ou en nous contactant à l'adresse indiquée ci-dessous pour "
        "vos dossiers de constat.",
  ),
  LegalSection(
    '8. Mineurs',
    "L'application est destinée aux titulaires d'un permis de conduire "
        "valide et n'est pas destinée aux mineurs.",
  ),
  LegalSection(
    '9. Modifications de cette politique',
    "Cette politique peut être mise à jour pour refléter des évolutions "
        "légales, techniques ou fonctionnelles de l'application. La date de "
        "dernière mise à jour en haut de cette page vous permet de suivre "
        "ces changements.",
  ),
  LegalSection(
    '10. Contact',
    "Pour toute question relative à vos données personnelles, contactez-"
        "nous à support@camaircost.com ou depuis Profil > Paramètres > "
        "Centre d'aide.",
  ),
];

const conditionsUtilisationMiseAJour = 'Janvier 2026';

const conditionsUtilisation = [
  LegalSection(
    '1. Objet',
    "Les présentes conditions régissent l'utilisation de l'application "
        "eConstat, qui permet de déclarer un accident automobile au moyen "
        "d'un constat amiable numérique : capture de photos, saisie des "
        "informations des véhicules impliqués, signature électronique des "
        "conducteurs, transmission du dossier et reconstitution 3D "
        "indicative de l'accident.",
  ),
  LegalSection(
    '2. Acceptation',
    "En créant un compte ou en utilisant l'application, vous acceptez "
        "sans réserve les présentes conditions d'utilisation ainsi que la "
        "politique de confidentialité. Si vous n'acceptez pas ces "
        "conditions, vous ne devez pas utiliser l'application.",
  ),
  LegalSection(
    '3. Compte utilisateur',
    "Vous êtes responsable de l'exactitude des informations fournies lors "
        "de la création de votre compte (identité, permis de conduire) "
        "ainsi que de la confidentialité de vos identifiants de connexion. "
        "Toute activité effectuée depuis votre compte est présumée "
        "provenir de vous.",
  ),
  LegalSection(
    '4. Exactitude des déclarations',
    "Les informations que vous renseignez dans un constat (identité des "
        "conducteurs, immatriculation, vitesse estimée, trajectoire, point "
        "de choc, conditions météo) engagent votre responsabilité et "
        "doivent refléter fidèlement les circonstances réelles de "
        "l'accident. Une déclaration sciemment inexacte peut engager votre "
        "responsabilité civile ou pénale et invalider votre couverture "
        "d'assurance.",
  ),
  LegalSection(
    '5. Valeur juridique du constat',
    "Le constat généré par l'application, une fois renseigné et signé "
        "électroniquement par les deux conducteurs impliqués, a la même "
        "valeur juridique qu'un constat amiable rempli sur support papier. "
        "La signature électronique capturée dans l'application vaut "
        "acceptation du contenu du constat par son signataire.",
  ),
  LegalSection(
    '6. Reconstitution 3D',
    "La reconstitution 3D proposée par l'application est générée "
        "automatiquement à partir des données déclarées par les "
        "utilisateurs (positions, vitesses estimées, trajectoires, point de "
        "choc). Il s'agit d'une aide visuelle à la compréhension de "
        "l'accident, et non d'une expertise technique ou judiciaire : elle "
        "ne détermine pas les responsabilités et ne remplace pas une "
        "expertise professionnelle réalisée par un expert automobile ou "
        "une autorité compétente.",
  ),
  LegalSection(
    '7. Disponibilité du service',
    "Nous nous efforçons d'assurer la disponibilité de l'application mais "
        "ne pouvons garantir un fonctionnement ininterrompu ou exempt "
        "d'erreurs, notamment en cas de maintenance, de panne technique ou "
        "d'absence de connexion réseau. Un dossier commencé sans connexion "
        "reste enregistré localement et est transmis dès que la connexion "
        "est rétablie.",
  ),
  LegalSection(
    '8. Propriété intellectuelle',
    "L'application, son design, ses icônes et son contenu éditorial sont "
        "protégés par le droit de la propriété intellectuelle. Les "
        "contenus que vous soumettez (photos, données du constat, "
        "signature) restent votre propriété ; vous nous accordez le droit "
        "de les traiter dans le seul but de constituer et transmettre "
        "votre dossier de sinistre.",
  ),
  LegalSection(
    '9. Limitation de responsabilité',
    "L'application ne peut être tenue responsable des conséquences d'une "
        "déclaration inexacte ou incomplète fournie par un utilisateur, ni "
        "des décisions prises par un assureur ou une autorité sur la base "
        "d'un dossier transmis.",
  ),
  LegalSection(
    '10. Résiliation',
    "Vous pouvez supprimer votre compte à tout moment depuis Profil > "
        "Paramètres. Nous pouvons suspendre ou résilier l'accès d'un "
        "compte en cas d'usage frauduleux ou de manquement grave aux "
        "présentes conditions.",
  ),
  LegalSection(
    '11. Modifications',
    "Les présentes conditions peuvent être mises à jour ; la poursuite de "
        "l'utilisation de l'application après une mise à jour vaut "
        "acceptation des nouvelles conditions.",
  ),
  LegalSection(
    '12. Contact',
    "Pour toute question relative à ces conditions, contactez-nous à "
        "support@camaircost.com.",
  ),
];
