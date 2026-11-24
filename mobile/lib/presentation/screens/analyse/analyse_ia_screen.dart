import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/entities/analyse_ia.dart';
import '../../state/api_providers.dart';
import '../../state/constat_draft_notifier.dart';

/// Entre la capture guidée et le formulaire : envoie les photos au serveur,
/// les fait analyser par l'IA (plaques, dégâts, zone de choc, météo) et
/// pré-remplit le formulaire. Sans IA disponible, on passe simplement au
/// formulaire à remplir à la main.
class AnalyseIaScreen extends ConsumerStatefulWidget {
  const AnalyseIaScreen({super.key});

  @override
  ConsumerState<AnalyseIaScreen> createState() => _AnalyseIaScreenState();
}

enum _Phase { envoi, analyse, termine, erreur }

class _AnalyseIaScreenState extends ConsumerState<AnalyseIaScreen> {
  _Phase _phase = _Phase.envoi;
  int _envoyes = 0;
  int _total = 0;
  String? _erreur;
  AnalyseIa? _analyse;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _lancer());
  }

  Future<void> _lancer() async {
    final repo = ref.read(dossiersRepositoryProvider);
    final notifier = ref.read(constatDraftProvider.notifier);
    setState(() {
      _phase = _Phase.envoi;
      _erreur = null;
    });
    try {
      final dossierId = await repo.preparerBrouillon(
        ref.read(constatDraftProvider),
        surCreation: notifier.setDossierId,
        surEnvoi: notifier.marquerEnvoyee,
        progression: (n, total) {
          if (mounted) {
            setState(() {
              _envoyes = n;
              _total = total;
            });
          }
        },
      );
      notifier.setDossierId(dossierId);
      if (!mounted) return;
      setState(() => _phase = _Phase.analyse);
      final analyse = await repo.analyserPhotos(dossierId);
      notifier.appliquerAnalyseIa(analyse);
      if (mounted) {
        setState(() {
          _phase = _Phase.termine;
          _analyse = analyse;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _phase = _Phase.erreur;
          _erreur = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppStrings.of(context).t;
    final theme = Theme.of(context);
    final analyse = _analyse;

    return Scaffold(
      appBar: AppBar(title: Text(t('analyse_titre'))),
      bottomNavigationBar: _phase == _Phase.termine || _phase == _Phase.erreur
          ? SafeArea(
              minimum: const EdgeInsets.all(16),
              child: _phase == _Phase.erreur
                  ? ElevatedButton.icon(onPressed: _lancer, icon: const Icon(Icons.refresh), label: Text(t('analyse_reessayer')))
                  : ElevatedButton.icon(
                      onPressed: () => Navigator.pushReplacementNamed(context, AppRoutes.formulaire),
                      icon: const Icon(Icons.edit_note),
                      label: Text(t('analyse_vers_formulaire')),
                    ),
            )
          : null,
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_phase == _Phase.envoi || _phase == _Phase.analyse) ...[
            const SizedBox(height: 40),
            Center(
              child: SizedBox(
                width: 72,
                height: 72,
                child: CircularProgressIndicator(
                  strokeWidth: 6,
                  value: _phase == _Phase.envoi && _total > 0 ? _envoyes / _total : null,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              _phase == _Phase.envoi
                  ? t('analyse_envoi').replaceFirst('%s', '$_envoyes').replaceFirst('%s', '$_total')
                  : t('analyse_en_cours'),
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(t('analyse_explication'), textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
          ],
          if (_phase == _Phase.erreur) ...[
            const Icon(Icons.cloud_off, size: 56, color: AppTheme.danger),
            const SizedBox(height: 12),
            Text(t('analyse_erreur_envoi'), textAlign: TextAlign.center, style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(_erreur ?? '', textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
          ],
          if (_phase == _Phase.termine && analyse != null) ...[
            if (!analyse.reussie)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: Text(t(analyse.statut == 'indisponible' ? 'analyse_indisponible' : 'analyse_echec')),
                  subtitle: Text(t('analyse_saisie_manuelle')),
                ),
              )
            else ...[
              Card(
                color: AppTheme.accent.withValues(alpha: 0.08),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.auto_awesome, color: AppTheme.accent),
                          const SizedBox(width: 8),
                          Expanded(child: Text(t('analyse_resultat'), style: theme.textTheme.titleMedium)),
                          Text('${(analyse.confiance * 100).round()} %', style: theme.textTheme.labelLarge),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(analyse.resume, style: theme.textTheme.bodyMedium),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              for (final v in analyse.vehicules)
                Card(
                  child: ListTile(
                    leading: CircleAvatar(child: Text(v.conducteur)),
                    title: Text(v.plaque.isEmpty ? t('analyse_plaque_illisible') : v.plaque),
                    subtitle: Text('${v.marque} ${v.couleur}\n${v.degats}'.trim()),
                    isThreeLine: true,
                  ),
                ),
              const SizedBox(height: 8),
              Text(t('analyse_avertissement'), style: theme.textTheme.bodySmall),
            ],
          ],
        ],
      ),
    );
  }
}
