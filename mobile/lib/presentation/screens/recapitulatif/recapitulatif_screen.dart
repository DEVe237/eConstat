import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signature/signature.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../../domain/entities/vehicule_implique.dart';
import '../../state/api_providers.dart';
import '../../state/constat_draft_notifier.dart';
import '../../widgets/step_progress_header.dart';
import '../confirmation/confirmation_screen.dart';

const _zonesChocLabelsCles = {
  'avant': 'zone_avant',
  'arriere': 'zone_arriere',
  'flanc_gauche': 'zone_flanc_gauche',
  'flanc_droit': 'zone_flanc_droit',
};

/// Quand [lectureSeule] est vrai, l'écran affiche le constat déjà envoyé
/// (signatures déjà capturées, en image statique) au lieu de proposer de
/// signer/soumettre à nouveau — c'est le cas quand on revient sur le
/// récapitulatif depuis l'écran de confirmation, après l'envoi.
class RecapitulatifArgs {
  const RecapitulatifArgs({this.lectureSeule = false});

  final bool lectureSeule;
}

class RecapitulatifScreen extends ConsumerStatefulWidget {
  const RecapitulatifScreen({super.key});

  @override
  ConsumerState<RecapitulatifScreen> createState() =>
      _RecapitulatifScreenState();
}

class _RecapitulatifScreenState extends ConsumerState<RecapitulatifScreen> {
  late final Map<String, SignatureController> _controllers;
  bool _envoiEnCours = false;

  /// Tant qu'un doigt est posé sur un pavé de signature, on empêche la liste
  /// de défiler : sans ça, le geste de scroll de la `ListView` entrait en
  /// concurrence avec le tracé de signature et l'empêchait de s'enregistrer
  /// (le bouton d'envoi ne s'activait donc jamais, même après avoir signé).
  bool _dessinEnCours = false;

  @override
  void initState() {
    super.initState();
    final vehicules = ref.read(constatDraftProvider).vehicules;
    _controllers = {
      for (var i = 0; i < vehicules.length; i++)
        _keySignature(i, vehicules[i]): SignatureController(
          penStrokeWidth: 3,
          penColor: Colors.black,
          exportBackgroundColor: Colors.white,
        ),
    };
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _toutesSignaturesPresentes =>
      _controllers.isNotEmpty && _controllers.values.every((c) => c.isNotEmpty);

  Future<void> _envoyer() async {
    setState(() => _envoiEnCours = true);
    final notifier = ref.read(constatDraftProvider.notifier);
    for (final entry in _controllers.entries) {
      final bytes = await entry.value.toPngBytes();
      if (bytes != null) {
        notifier.setSignature(entry.key, bytes);
      }
    }

    try {
      final draft = ref.read(constatDraftProvider);
      final resultat = await ref
          .read(dossiersRepositoryProvider)
          .envoyerConstat(draft);
      if (!mounted) return;
      Navigator.pushNamed(
        context,
        AppRoutes.confirmation,
        arguments: ConfirmationArgs(
          numeroDossier: resultat.numeroCourt,
          dossierId: resultat.id,
          transmisAuServeur: true,
        ),
      );
    } on DioException catch (e) {
      if (!mounted) return;
      final t = AppStrings.of(context).t;
      final message =
          e.type == DioExceptionType.connectionError ||
              e.type == DioExceptionType.connectionTimeout
          ? t('recap_erreur_connexion')
          : t('recap_erreur_envoi').replaceFirst('%s', _messageServeur(e));
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _envoiEnCours = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final draft = ref.watch(constatDraftProvider);
    final args =
        ModalRoute.of(context)?.settings.arguments as RecapitulatifArgs?;
    final lectureSeule = args?.lectureSeule ?? false;

    return Scaffold(
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            AppSpacing.lg,
          ),
          child: lectureSeule
              ? SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(t('recap_fermer')),
                  ),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_controllers.isNotEmpty && !_toutesSignaturesPresentes)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: Text(
                          t('recap_signez_hint'),
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _envoiEnCours
                                ? null
                                : () => Navigator.pop(context),
                            child: Text(t('recap_retour')),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed:
                                _controllers.isNotEmpty &&
                                    _toutesSignaturesPresentes &&
                                    !_envoiEnCours
                                ? _envoyer
                                : null,
                            child: _envoiEnCours
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.4,
                                      color: Colors.white,
                                    ),
                                  )
                                : Text(
                                    t('recap_soumettre'),
                                    textAlign: TextAlign.center,
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.sm,
                AppSpacing.xs,
                AppSpacing.sm,
                AppSpacing.xs,
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(
                      Icons.arrow_back,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      t('home_titre'),
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 40),
                ],
              ),
            ),
            const Divider(height: 1),
            StepProgressHeader(
              currentStep: 2,
              variant: StepProgressHeaderVariant.numbered,
              labels: [
                t('step_photos'),
                t('step_formulaire'),
                t('step_signature'),
              ],
            ),
            Expanded(
              child: ListView(
                physics: _dessinEnCours
                    ? const NeverScrollableScrollPhysics()
                    : const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.md,
                  AppSpacing.lg,
                  AppSpacing.xl,
                ),
                children: [
                  Text(
                    lectureSeule
                        ? t('recap_recap_titre')
                        : t('recap_verification_titre'),
                    style: theme.textTheme.headlineLarge,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    lectureSeule
                        ? t('recap_deja_transmis')
                        : t('recap_verifier_sous'),
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SummaryCard(
                    children: [
                      _InfoRow(
                        icon: Icons.event_outlined,
                        titre: t('recap_date_heure'),
                        valeur: draft.dateAccident != null
                            ? _formatDateTime(draft.dateAccident!, t)
                            : t('recap_date_non_renseignee'),
                      ),
                      const Divider(
                        height: 1,
                        indent: AppSpacing.lg,
                        endIndent: AppSpacing.lg,
                      ),
                      _InfoRow(
                        icon: Icons.location_on_outlined,
                        titre: t('recap_lieu'),
                        valeur: draft.aLocalisation
                            ? _formatLocation(draft.latitude!, draft.longitude!)
                            : t('recap_non_localise'),
                      ),
                    ],
                  ),
                  if (draft.photoPaths.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.md),
                    SizedBox(
                      height: 64,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: draft.photoPaths.length,
                        separatorBuilder: (_, _) =>
                            const SizedBox(width: AppSpacing.sm),
                        itemBuilder: (context, index) => ClipRRect(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          child: Image.file(
                            File(draft.photoPaths[index]),
                            width: 64,
                            height: 64,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  for (var i = 0; i < draft.vehicules.length; i++) ...[
                    _VehicleRecapCard(
                      lettre: String.fromCharCode(65 + i),
                      couleur: i == 0
                          ? theme.colorScheme.primary
                          : const Color(0xFFE0692B),
                      vehicule: draft.vehicules[i],
                      labelVignette: i == 0
                          ? t('recap_votre_vehicule')
                          : t('recap_tiers'),
                      onModifier: () => Navigator.pop(context),
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    t('recap_signatures'),
                    style: theme.textTheme.headlineMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  if (lectureSeule) ...[
                    for (final entry in draft.signatures.entries) ...[
                      _SignatureReadOnly(
                        title: entry.key,
                        pngBytes: entry.value,
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                  ] else ...[
                    _InfoCallout(text: t('recap_signature_legalese')),
                    const SizedBox(height: AppSpacing.md),
                    if (_controllers.isEmpty)
                      _EmptyStateCallout(text: t('recap_aucun_conducteur')),
                    for (final entry in _controllers.entries) ...[
                      _SignatureSection(
                        title: entry.key,
                        controller: entry.value,
                        onClear: () => setState(() => entry.value.clear()),
                        onDrawStart: () =>
                            setState(() => _dessinEnCours = true),
                        onDrawEnd: () => setState(() => _dessinEnCours = false),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                    ],
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Explication du serveur (« Dossier incomplet : … ») plutôt que l'erreur technique.
  String _messageServeur(DioException e) {
    final data = e.response?.data;
    final message = data is Map ? data['message'] : null;
    if (message is List) return message.join(', ');
    return message is String ? message : '${e.message}';
  }

  String _keySignature(int index, VehiculeImplique vehicule) {
    if (vehicule.conducteurNom.isNotEmpty) {
      // Deux conducteurs homonymes signent quand même séparément.
      final autres = ref.read(constatDraftProvider).vehicules.take(index);
      if (autres.any((v) => v.conducteurNom == vehicule.conducteurNom)) {
        return '${vehicule.conducteurNom} (${String.fromCharCode(65 + index)})';
      }
      return vehicule.conducteurNom;
    }
    return 'Conducteur ${String.fromCharCode(65 + index)}';
  }

  String _formatDateTime(DateTime value, String Function(String) t) {
    final day = value.day.toString().padLeft(2, '0');
    final year = value.year.toString();
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    return '$day ${t(_moisCle(value.month))} $year, $hour:$minute';
  }

  String _formatLocation(double latitude, double longitude) {
    return '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}';
  }

  String _moisCle(int month) => 'mois_${month.toString().padLeft(2, '0')}';
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(children: children),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.titre,
    required this.valeur,
  });

  final IconData icon;
  final String titre;
  final String valeur;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(
                alpha: context.isDark ? 0.22 : 0.12,
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: theme.colorScheme.primary),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(titre, style: theme.textTheme.bodyMedium),
                const SizedBox(height: 2),
                Text(valeur, style: theme.textTheme.titleSmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VehicleRecapCard extends StatelessWidget {
  const _VehicleRecapCard({
    required this.lettre,
    required this.couleur,
    required this.vehicule,
    required this.labelVignette,
    required this.onModifier,
  });

  final String lettre;
  final Color couleur;
  final VehiculeImplique vehicule;
  final String labelVignette;
  final VoidCallback onModifier;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final titre = vehicule.conducteurNom.isEmpty
        ? labelVignette
        : vehicule.conducteurNom;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: couleur.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                alignment: Alignment.center,
                child: Text(
                  lettre,
                  style: theme.textTheme.titleLarge?.copyWith(color: couleur),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(child: Text(titre, style: theme.textTheme.titleMedium)),
              IconButton(
                icon: const Icon(Icons.edit_outlined, size: 20),
                color: theme.colorScheme.primary,
                onPressed: onModifier,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          _RecapLine(
            t('recap_modele'),
            vehicule.marque.isEmpty ? '—' : vehicule.marque,
          ),
          _RecapLine(
            t('recap_immat'),
            vehicule.plaque.isEmpty ? '—' : vehicule.plaque,
          ),
          _RecapLine(
            t('recap_vitesse_estimee'),
            '${vehicule.vitesseEstimee} km/h',
          ),
          _RecapLine(
            t('recap_sens_circulation'),
            vehicule.sensCirculation.isEmpty ? '—' : vehicule.sensCirculation,
          ),
          _RecapLine(
            t('recap_degats'),
            vehicule.zoneChoc.isEmpty
                ? '—'
                : (_zonesChocLabelsCles[vehicule.zoneChoc] != null
                      ? t(_zonesChocLabelsCles[vehicule.zoneChoc]!)
                      : '—'),
          ),
        ],
      ),
    );
  }
}

class _RecapLine extends StatelessWidget {
  const _RecapLine(this.label, this.valeur);

  final String label;
  final String valeur;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text('$label :', style: theme.textTheme.bodyMedium)),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            flex: 2,
            child: Text(
              valeur,
              textAlign: TextAlign.right,
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoCallout extends StatelessWidget {
  const _InfoCallout({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(
          alpha: context.isDark ? 0.16 : 0.06,
        ),
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 22, color: theme.colorScheme.primary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(text, style: theme.textTheme.bodyMedium)),
        ],
      ),
    );
  }
}

class _EmptyStateCallout extends StatelessWidget {
  const _EmptyStateCallout({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Text(
        text,
        style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.error,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Affichage statique d'une signature déjà capturée (mode lecture seule,
/// après envoi du constat) — pas de `SignatureController`, juste l'image.
class _SignatureReadOnly extends StatelessWidget {
  const _SignatureReadOnly({required this.title, required this.pngBytes});

  final String title;
  final Uint8List pngBytes;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: theme.textTheme.headlineSmall),
        const SizedBox(height: AppSpacing.sm),
        Container(
          height: 140,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.xxl),
            border: Border.all(color: context.borderColor, width: 1.4),
          ),
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Image.memory(pngBytes, fit: BoxFit.contain),
        ),
      ],
    );
  }
}

class _SignatureSection extends StatelessWidget {
  const _SignatureSection({
    required this.title,
    required this.controller,
    required this.onClear,
    required this.onDrawStart,
    required this.onDrawEnd,
  });

  final String title;
  final SignatureController controller;
  final VoidCallback onClear;
  final VoidCallback onDrawStart;
  final VoidCallback onDrawEnd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final badge = title.endsWith('A') ? 'A' : 'B';
    final badgeColor = badge == 'A'
        ? theme.colorScheme.primary
        : const Color(0xFFB65A00);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              alignment: Alignment.center,
              child: Text(
                badge,
                style: theme.textTheme.titleSmall?.copyWith(
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(child: Text(title, style: theme.textTheme.headlineSmall)),
            TextButton(
              onPressed: onClear,
              child: Text(
                t('recap_effacer'),
                style: TextStyle(color: badgeColor),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Listener(
          onPointerDown: (_) => onDrawStart(),
          onPointerUp: (_) => onDrawEnd(),
          onPointerCancel: (_) => onDrawEnd(),
          child: Container(
            height: MediaQuery.orientationOf(context) == Orientation.landscape
                ? 170
                : 280,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.xxl),
              border: Border.all(color: context.borderColor, width: 1.4),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.xxl),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Signature(
                      controller: controller,
                      backgroundColor: Colors.transparent,
                    ),
                  ),
                  const Positioned(
                    left: 22,
                    right: 22,
                    bottom: 16,
                    child: DottedLine(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class DottedLine extends StatelessWidget {
  const DottedLine({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final count = (constraints.maxWidth / 10).floor().clamp(1, 1000);
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(
            count,
            (_) =>
                Container(width: 6, height: 2, color: const Color(0xFFD7DCE6)),
          ),
        );
      },
    );
  }
}
