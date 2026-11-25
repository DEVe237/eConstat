import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/network/erreurs.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../state/api_providers.dart';
import '../simulation3d/simulation3d_screen.dart';

class DossierDetailArgs {
  const DossierDetailArgs({
    required this.dossierId,
    required this.titre,
    required this.date,
    required this.statut,
    required this.statutColor,
    required this.plaque,
  });

  final String dossierId;
  final String titre;
  final String date;
  final String statut;
  final Color statutColor;
  final String plaque;
}

/// Clé de traduction et couleur du statut affiché au conducteur.
(String, Color) etiquetteStatut(String statut, bool enTraitement) => switch (statut) {
      'transmis' when enTraitement => ('historique_en_traitement', const Color(0xFF6204BF)),
      'transmis' => ('historique_transmis', const Color(0xFF6B7280)),
      'valide' => ('historique_valide', const Color(0xFF1E79E8)),
      'conteste' => ('historique_conteste', const Color(0xFFB60B0B)),
      _ => ('historique_en_cours', const Color(0xFFE07200)),
    };

const _categoriesDocument = [
  'carte_grise',
  'visite_technique',
  'assurance',
  'cni',
  'permis',
  'autre_document',
];

/// Détail d'un dossier depuis l'historique, en lecture seule : décision de
/// l'autorité et sa justification, véhicules, photos, pièces et accès à la
/// reconstitution 3D.
class DossierDetailScreen extends ConsumerWidget {
  const DossierDetailScreen({super.key, required this.args});

  final DossierDetailArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppStrings.of(context).t;
    final detail = ref.watch(dossierDetailProvider(args.dossierId));
    final suivi = ref.watch(suiviProvider(args.dossierId)).value;
    ref.listen(suiviProvider(args.dossierId), (avant, apres) {
      final a = avant?.value;
      final b = apres.value;
      if (a == null || b == null) return;
      final connues = {for (final e in _liste(a['etapes'])) e['id']};
      final nouvelles = _liste(b['etapes']).where((e) => !connues.contains(e['id'])).toList();
      if (nouvelles.isEmpty && a['statut'] == b['statut']) return;
      ref.invalidate(dossierDetailProvider(args.dossierId));
      ref.invalidate(historiqueProvider);
      if (nouvelles.isEmpty) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('suivi_maj').replaceFirst('%s', t('suivi_${nouvelles.last['type']}')))),
      );
    });

    return Scaffold(
      appBar: AppBar(title: Text(args.titre)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () {
            ref.invalidate(suiviProvider(args.dossierId));
            return ref.refresh(dossierDetailProvider(args.dossierId).future);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.page),
            children: [
              ...detail.when(
                skipError: true,
                loading: () => [
                  const Padding(
                    padding: EdgeInsets.all(AppSpacing.xxxl),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ],
                error: (e, _) => [
                  _Carte(
                    enfants: [
                      Text(messageServeur(e) ?? t('historique_serveur_message')),
                      const SizedBox(height: AppSpacing.sm),
                      OutlinedButton.icon(
                        onPressed: () => ref.invalidate(dossierDetailProvider(args.dossierId)),
                        icon: const Icon(Icons.refresh, size: 18),
                        label: Text(t('analyse_reessayer')),
                      ),
                    ],
                  ),
                ],
                data: (d) => _contenu(context, ref, d, suivi),
              ),
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(46),
                ),
                onPressed: () => Navigator.pushNamed(
                  context,
                  AppRoutes.simulation3d,
                  arguments: Simulation3dArgs(dossierId: args.dossierId),
                ),
                icon: const Icon(Icons.view_in_ar_outlined, size: 20),
                label: Text(t('dossier_voir_3d')),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _contenu(BuildContext context, WidgetRef ref, Map<String, dynamic> d, Map<String, dynamic>? suivi) {
    final t = AppStrings.of(context).t;
    final theme = Theme.of(context);
    final base = ref.read(apiClientProvider).dio.options.baseUrl;
    final medias = _liste(d['medias']);
    final vehicules = _liste(d['vehiculesImpliques']);
    final signatures = _liste(d['signatures']);
    final absents = _liste(d['documentsAbsents']);
    final photos = medias.where((m) => m['type'] == 'photo' && !_categoriesDocument.contains(m['categorie'])).toList();
    final videos = medias.where((m) => m['type'] == 'video').toList();
    final statut = d['statut'] as String? ?? '';
    final etiquette = suivi == null
        ? (args.statut, args.statutColor)
        : switch (etiquetteStatut(suivi['statut'] as String? ?? '', suivi['enTraitement'] == true)) {
            (final cle, final couleur) => (t(cle), couleur),
          };

    return [
      _Carte(
        enfants: [
          Row(
            children: [
              Expanded(child: Text(t('dossier_statut'), style: theme.textTheme.bodyMedium)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
                decoration: BoxDecoration(
                  color: etiquette.$2,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  etiquette.$1,
                  style: theme.textTheme.labelSmall?.copyWith(color: Colors.white),
                ),
              ),
            ],
          ),
          const Divider(height: AppSpacing.xl),
          _Ligne(t('dossier_date'), args.date),
          _Ligne(t('dossier_numero'), '#${args.dossierId.substring(0, 8).toUpperCase()}'),
          if ((d['conditionsMeteo'] as String?)?.isNotEmpty ?? false)
            _Ligne(t('form_meteo_titre'), t(d['conditionsMeteo'] as String)),
        ],
      ),
      if (statut == 'valide' || statut == 'conteste') _decision(context, d, statut),
      if (suivi != null && suivi['statut'] != 'brouillon') ...[
        _Titre(t('suivi_titre')),
        _Carte(enfants: _etapes(context, suivi)),
      ],
      _Titre(t('dossier_vehicules')),
      for (final (i, v) in vehicules.indexed)
        _Carte(
          enfants: [
            Text(
              '${String.fromCharCode(65 + i)} · ${v['conducteurNom'] ?? '—'}',
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: AppSpacing.xs),
            _Ligne(t('dossier_plaque'), _texte(v['plaque'])),
            _Ligne(t('dossier_marque'), _texte(v['marque'])),
            _Ligne(t('dossier_zone_choc'), _zone(t, v['zoneChoc'])),
          ],
        ),
      if (vehicules.isEmpty) _Carte(enfants: [Text(t('dossier_aucun'))]),
      _Titre('${t('dossier_photos')} (${photos.length})'),
      if (photos.isEmpty)
        _Carte(enfants: [Text(t('dossier_aucun'))])
      else
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.sm,
          crossAxisSpacing: AppSpacing.sm,
          children: [for (final m in photos) _Vignette(url: '$base${m['url']}', libelle: _libelle(t, m))],
        ),
      if (videos.isNotEmpty) ...[
        const SizedBox(height: AppSpacing.sm),
        for (final v in videos)
          _Ligne(
            t('capture_etape_video_tour'),
            v['dureeSecondes'] == null ? '✓' : '${(v['dureeSecondes'] as num).round()} s',
          ),
      ],
      _Titre(t('dossier_pieces')),
      for (final c in const ['A', 'B'])
        _Carte(
          enfants: [
            Text('${t('dossier_conducteur')} $c', style: theme.textTheme.titleSmall),
            const SizedBox(height: AppSpacing.xs),
            for (final cat in _categoriesDocument)
              _Ligne(t('capture_etape_$cat'), _etatPiece(t, medias, absents, cat, c)),
          ],
        ),
      _Titre(t('dossier_signatures')),
      _Carte(
        enfants: [
          if (signatures.isEmpty) Text(t('dossier_aucun')),
          for (final s in signatures) _Ligne(_texte(s['conducteurNom']), t('dossier_signe')),
        ],
      ),
    ];
  }

  /// Étapes du traitement, la prochaine attendue en dernier.
  List<Widget> _etapes(BuildContext context, Map<String, dynamic> suivi) {
    final t = AppStrings.of(context).t;
    final theme = Theme.of(context);
    final attente = switch (suivi['statut']) {
      'valide' => null,
      'transmis' when suivi['enTraitement'] != true => t('suivi_attente_agent'),
      _ => t('suivi_attente_decision'),
    };

    Widget ligne(Widget icone, String titre, String? date) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(
            children: [
              SizedBox(width: 22, height: 22, child: Center(child: icone)),
              const SizedBox(width: AppSpacing.sm),
              Expanded(child: Text(titre, style: theme.textTheme.bodyMedium)),
              if (date != null) Text(date, style: theme.textTheme.bodySmall),
            ],
          ),
        );

    return [
      for (final e in _liste(suivi['etapes']))
        ligne(
          Icon(
            e['type'] == 'contestation' ? Icons.report_outlined : Icons.check_circle,
            size: 20,
            color: e['type'] == 'contestation' ? const Color(0xFFB60B0B) : const Color(0xFF007A5E),
          ),
          t('suivi_${e['type']}'),
          _dateCourte(e['date']),
        ),
      if (attente != null)
        ligne(
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2, color: theme.colorScheme.primary),
          ),
          attente,
          null,
        ),
    ];
  }

  static String? _dateCourte(Object? iso) {
    final d = iso is String ? DateTime.tryParse(iso)?.toLocal() : null;
    if (d == null) return null;
    String deux(int n) => '$n'.padLeft(2, '0');
    return '${deux(d.day)}/${deux(d.month)} ${deux(d.hour)}:${deux(d.minute)}';
  }

  /// Décision de l'agent : conclusion et justification, ou motif de contestation.
  Widget _decision(BuildContext context, Map<String, dynamic> d, String statut) {
    final t = AppStrings.of(context).t;
    final theme = Theme.of(context);
    final valide = statut == 'valide';
    final couleur = valide ? const Color(0xFF007A5E) : const Color(0xFFB60B0B);
    final partA = (d['partResponsabiliteA'] as num?)?.toInt();
    final conclusion = switch (d['responsabilite']) {
      'A' => t('conclusion_a'),
      'B' => t('conclusion_b'),
      'partagee' => t('conclusion_partagee')
          .replaceFirst('%s', '${partA ?? 0}')
          .replaceFirst('%s', '${100 - (partA ?? 0)}'),
      'indeterminee' => t('conclusion_indeterminee'),
      _ => null,
    };
    final commentaire = d['commentaireAgent'] as String?;

    return Container(
      margin: const EdgeInsets.only(top: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: couleur.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        border: Border.all(color: couleur, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(valide ? Icons.gavel : Icons.report_outlined, color: couleur, size: 20),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  t(valide ? 'dossier_conclusion' : 'dossier_contestation'),
                  style: theme.textTheme.titleSmall?.copyWith(color: couleur),
                ),
              ),
            ],
          ),
          if (conclusion != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(conclusion, style: theme.textTheme.titleMedium),
          ],
          if (commentaire != null && commentaire.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(commentaire, style: theme.textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }

  static List<Map<String, dynamic>> _liste(Object? v) => [
        for (final e in (v as List? ?? const [])) Map<String, dynamic>.from(e as Map),
      ];

  static String _texte(Object? v) => v is String && v.isNotEmpty ? v : '—';

  static String _zone(String Function(String) t, Object? zone) =>
      zone is String && zone.isNotEmpty ? t('zone_$zone') : '—';

  static String _libelle(String Function(String) t, Map<String, dynamic> m) {
    final categorie = m['categorie'] as String? ?? 'libre';
    final titre = categorie == 'libre' ? t('capture_photo') : t('capture_etape_$categorie');
    return m['conducteur'] == null ? titre : '$titre ${m['conducteur']}';
  }

  static String _etatPiece(
    String Function(String) t,
    List<Map<String, dynamic>> medias,
    List<Map<String, dynamic>> absents,
    String categorie,
    String conducteur,
  ) {
    bool concerne(Map<String, dynamic> m) => m['categorie'] == categorie && m['conducteur'] == conducteur;
    if (medias.any(concerne)) return t('piece_fournie');
    if (absents.any(concerne)) return t('piece_absente');
    return '—';
  }
}

class _Titre extends StatelessWidget {
  const _Titre(this.texte);

  final String texte;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: AppSpacing.xl, bottom: AppSpacing.sm),
        child: Text(texte, style: Theme.of(context).textTheme.titleMedium),
      );
}

class _Carte extends StatelessWidget {
  const _Carte({required this.enfants});

  final List<Widget> enfants;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(AppRadius.xxl),
          border: Border.all(color: context.borderColor),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: enfants),
      );
}

class _Ligne extends StatelessWidget {
  const _Ligne(this.label, this.valeur);

  final String label;
  final String valeur;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
          const SizedBox(width: AppSpacing.sm),
          Flexible(
            child: Text(
              valeur,
              style: theme.textTheme.titleSmall,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// Photo servie par lien signé ; un appui l'ouvre en grand.
class _Vignette extends StatelessWidget {
  const _Vignette({required this.url, required this.libelle});

  final String url;
  final String libelle;

  Widget _image(BoxFit ajustement) => Image.network(
        url,
        fit: ajustement,
        errorBuilder: (_, _, _) => const Center(child: Icon(Icons.broken_image_outlined)),
        loadingBuilder: (_, enfant, progres) =>
            progres == null ? enfant : const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => showDialog<void>(
        context: context,
        builder: (_) => Dialog(
          clipBehavior: Clip.antiAlias,
          child: InteractiveViewer(child: _image(BoxFit.contain)),
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.xl),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(color: context.borderColor, child: _image(BoxFit.cover)),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                color: Colors.black54,
                child: Text(
                  libelle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 10),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
