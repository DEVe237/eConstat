import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../../domain/entities/vehicule_implique.dart';
import '../../state/constat_draft_notifier.dart';
import '../../widgets/app_form_field.dart';
import '../../widgets/step_progress_header.dart';

const _trajectoires = {
  'tout_droit': ('traj_tout_droit', Icons.north),
  'droite': ('traj_droite', Icons.north_east),
  'gauche': ('traj_gauche', Icons.north_west),
  'stationnement': ('traj_stationnement', Icons.local_parking),
};

const _conditionsMeteoOptions = [
  'meteo_beau',
  'meteo_pluie',
  'meteo_humide',
  'meteo_brouillard',
  'meteo_nuit',
];

class FormulaireScreen extends ConsumerStatefulWidget {
  const FormulaireScreen({super.key});

  @override
  ConsumerState<FormulaireScreen> createState() => _FormulaireScreenState();
}

class _FormulaireScreenState extends ConsumerState<FormulaireScreen> {
  final _formKey = GlobalKey<FormState>();
  late List<VehiculeImplique> _vehicules;
  // Clé de traduction ('meteo_humide' etc.) plutôt que texte affiché, pour
  // rester cohérent quel que soit la langue active au moment de la saisie.
  late String _conditionsMeteoCle;

  @override
  void initState() {
    super.initState();
    final draft = ref.read(constatDraftProvider);
    _vehicules = draft.vehicules.isEmpty
        ? [const VehiculeImplique(), const VehiculeImplique()]
        : List.of(draft.vehicules);
    _conditionsMeteoCle =
        _conditionsMeteoOptions.contains(draft.conditionsMeteo)
        ? draft.conditionsMeteo
        : 'meteo_humide';
  }

  void _valider(String Function(String) t) {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    final vehiculesNormalises = [
      for (var i = 0; i < _vehicules.length; i++)
        _vehicules[i].copyWith(
          conducteurNom: _vehicules[i].conducteurNom.isNotEmpty
              ? _vehicules[i].conducteurNom
              : t(
                  'form_conducteur_defaut',
                ).replaceFirst('%s', String.fromCharCode(65 + i)),
        ),
    ];

    final notifier = ref.read(constatDraftProvider.notifier);
    notifier.setVehicules(vehiculesNormalises);
    notifier.setConditionsMeteo(_conditionsMeteoCle);

    Navigator.pushNamed(context, AppRoutes.recapitulatif);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

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
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(t('form_precedent')),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed: () => _valider(t),
                  icon: const Icon(Icons.arrow_forward, size: 18),
                  label: Text(t('form_suivant'), textAlign: TextAlign.center),
                ),
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
              currentStep: 1,
              labels: [
                t('step_photos'),
                t('step_formulaire'),
                t('step_signature'),
              ],
            ),
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.md,
                    AppSpacing.lg,
                    AppSpacing.xl,
                  ),
                  children: [
                    Text(
                      t('form_etape_titre'),
                      style: theme.textTheme.headlineLarge,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      t('form_etape_sous'),
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    if (ref.watch(constatDraftProvider).analyseIa?.reussie ?? false) ...[
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.auto_awesome, color: theme.colorScheme.primary),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(child: Text(t('form_prerempli_ia'), style: theme.textTheme.bodyMedium)),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                    ],
                    for (var i = 0; i < _vehicules.length; i++) ...[
                      _VehiculeCard(
                        index: i,
                        couleur: i == 0
                            ? theme.colorScheme.primary
                            : const Color(0xFFE0692B),
                        vehicule: _vehicules[i],
                        onChanged: (v) => setState(() => _vehicules[i] = v),
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    _ConditionsMeteoCard(
                      selectionCle: _conditionsMeteoCle,
                      onChanged: (v) => setState(() => _conditionsMeteoCle = v),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    _PointChocCard(
                      vehicules: _vehicules,
                      onChanged: (index, zone) {
                        setState(() {
                          _vehicules[index] = _vehicules[index].copyWith(
                            zoneChoc: zone,
                          );
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VehiculeCard extends StatelessWidget {
  const _VehiculeCard({
    required this.index,
    required this.couleur,
    required this.vehicule,
    required this.onChanged,
  });

  final int index;
  final Color couleur;
  final VehiculeImplique vehicule;
  final ValueChanged<VehiculeImplique> onChanged;

  String get _lettre => String.fromCharCode(65 + index);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final vitesse = double.tryParse(vehicule.vitesseEstimee) ?? 30;

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
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: couleur.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  _lettre,
                  style: theme.textTheme.titleLarge?.copyWith(color: couleur),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  index == 0 ? t('form_vehicule_a') : t('form_vehicule_b'),
                  style: theme.textTheme.titleMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          AppFormField(
            label: t('form_nom_conducteur'),
            initialValue: vehicule.conducteurNom,
            hint: index == 0
                ? t('form_nom_conducteur_hint_a')
                : t('form_nom_conducteur_hint_b'),
            icon: Icons.person_outline,
            onChanged: (v) => onChanged(vehicule.copyWith(conducteurNom: v)),
          ),
          const SizedBox(height: AppSpacing.sm),
          AppFormField(
            label: t('form_marque'),
            initialValue: vehicule.marque,
            hint: t('form_marque_hint'),
            icon: Icons.directions_car_outlined,
            onChanged: (v) => onChanged(vehicule.copyWith(marque: v)),
          ),
          const SizedBox(height: AppSpacing.sm),
          AppFormField(
            label: t('form_plaque'),
            initialValue: vehicule.plaque,
            hint: index == 0 ? 'AA-123-BB' : 'CC-456-DD',
            icon: Icons.badge_outlined,
            onChanged: (v) => onChanged(vehicule.copyWith(plaque: v)),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(t('form_vitesse'), style: theme.textTheme.labelLarge),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text('0', style: theme.textTheme.bodySmall),
              Expanded(
                child: SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: couleur,
                    inactiveTrackColor: context.borderColor,
                    thumbColor: couleur,
                    overlayColor: couleur.withValues(alpha: 0.16),
                    trackHeight: 4,
                    thumbShape: const RoundSliderThumbShape(
                      enabledThumbRadius: 10,
                    ),
                  ),
                  child: Slider(
                    value: vitesse.clamp(0, 130),
                    min: 0,
                    max: 130,
                    divisions: 26,
                    onChanged: (v) => onChanged(
                      vehicule.copyWith(vitesseEstimee: v.round().toString()),
                    ),
                  ),
                ),
              ),
              Text('130+', style: theme.textTheme.bodySmall),
            ],
          ),
          Center(
            child: Text(
              '${vitesse.round()} km/h',
              style: theme.textTheme.headlineSmall?.copyWith(color: couleur),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(t('form_trajectoire'), style: theme.textTheme.labelLarge),
          const SizedBox(height: AppSpacing.sm),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: AppSpacing.sm,
            crossAxisSpacing: AppSpacing.sm,
            // 2.1 plutôt que 2.45 : au ratio précédent, les libellés sur deux
            // mots ("Tournant à droite"...) débordaient verticalement sur
            // certains téléphones (retour terrain, tuiles trop basses pour
            // icône + texte + padding).
            childAspectRatio: 2.1,
            children: [
              for (final entry in _trajectoires.entries)
                _TrajectoireTile(
                  labelCle: entry.value.$1,
                  icon: entry.value.$2,
                  couleur: couleur,
                  selectionne: vehicule.sensCirculation == entry.key,
                  onTap: () =>
                      onChanged(vehicule.copyWith(sensCirculation: entry.key)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TrajectoireTile extends StatelessWidget {
  const _TrajectoireTile({
    required this.labelCle,
    required this.icon,
    required this.couleur,
    required this.selectionne,
    required this.onTap,
  });

  final String labelCle;
  final IconData icon;
  final Color couleur;
  final bool selectionne;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xs,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: selectionne
              ? couleur.withValues(alpha: 0.10)
              : context.cardColor,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: selectionne ? couleur : context.borderColor,
            width: 1.4,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 19,
              color: selectionne ? couleur : context.textMuted,
            ),
            const SizedBox(height: 4),
            Text(
              AppStrings.of(context).t(labelCle),
              textAlign: TextAlign.center,
              style: theme.textTheme.labelMedium?.copyWith(
                color: selectionne ? couleur : theme.colorScheme.onSurface,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ConditionsMeteoCard extends StatelessWidget {
  const _ConditionsMeteoCard({
    required this.selectionCle,
    required this.onChanged,
  });

  final String selectionCle;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

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
          Text(t('form_meteo_titre'), style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(t('form_meteo_sous'), style: theme.textTheme.bodyMedium),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: [
              for (final optionCle in _conditionsMeteoOptions)
                ChoiceChip(
                  label: Text(t(optionCle)),
                  selected: selectionCle == optionCle,
                  onSelected: (_) => onChanged(optionCle),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PointChocCard extends StatelessWidget {
  const _PointChocCard({required this.vehicules, required this.onChanged});

  final List<VehiculeImplique> vehicules;
  final void Function(int index, String zone) onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

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
          Text(t('form_choc_titre'), style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(t('form_choc_sous'), style: theme.textTheme.bodyMedium),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _SilhouetteSelector(
                  label: t('form_vehicule_a_court'),
                  couleur: theme.colorScheme.primary,
                  zone: vehicules.isNotEmpty ? vehicules[0].zoneChoc : '',
                  onChanged: (zone) => onChanged(0, zone),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _SilhouetteSelector(
                  label: t('form_vehicule_b_court'),
                  couleur: const Color(0xFFAE1616),
                  zone: vehicules.length > 1 ? vehicules[1].zoneChoc : '',
                  onChanged: (zone) => onChanged(1, zone),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SilhouetteSelector extends StatelessWidget {
  const _SilhouetteSelector({
    required this.label,
    required this.couleur,
    required this.zone,
    required this.onChanged,
  });

  final String label;
  final Color couleur;
  final String zone;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Column(
      children: [
        Text(
          label,
          style: theme.textTheme.titleSmall?.copyWith(color: couleur),
        ),
        const SizedBox(height: AppSpacing.xs),
        SizedBox(
          height: 190,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 130,
                height: 162,
                decoration: BoxDecoration(
                  color: context.elevatedSurfaceColor,
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                  border: Border.all(color: context.borderColor),
                ),
                child: Icon(
                  Icons.directions_car_outlined,
                  size: 58,
                  color: context.textMuted,
                ),
              ),
              Positioned(
                top: 6,
                child: _ZoneDot(
                  text: t('zone_avant'),
                  selected: zone == 'avant',
                  color: couleur,
                  onTap: () => onChanged('avant'),
                ),
              ),
              Positioned(
                bottom: 6,
                child: _ZoneDot(
                  text: t('zone_arriere'),
                  selected: zone == 'arriere',
                  color: couleur,
                  onTap: () => onChanged('arriere'),
                ),
              ),
              Positioned(
                left: 0,
                child: _ZoneDot(
                  text: t('zone_gauche_lettre'),
                  selected: zone == 'flanc_gauche',
                  color: couleur,
                  onTap: () => onChanged('flanc_gauche'),
                ),
              ),
              Positioned(
                right: 0,
                child: _ZoneDot(
                  text: t('zone_droite_lettre'),
                  selected: zone == 'flanc_droit',
                  color: couleur,
                  onTap: () => onChanged('flanc_droit'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ZoneDot extends StatelessWidget {
  const _ZoneDot({
    required this.text,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String text;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xs,
          vertical: 5,
        ),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.12) : context.cardColor,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: selected ? color : context.borderColor,
            width: 1.2,
          ),
        ),
        child: Text(
          text,
          style: theme.textTheme.labelSmall?.copyWith(
            color: selected ? color : theme.colorScheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
