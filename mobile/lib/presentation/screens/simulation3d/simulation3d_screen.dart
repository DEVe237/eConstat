import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../state/api_providers.dart';
import '../../state/simulation3d_providers.dart';

/// Durée par défaut de l'animation côté worker (`SIMULATION3D_DUREE_SECONDES`,
/// cf. backend/.env) — utilisée uniquement pour convertir la position du
/// slider (0..1) en secondes pour `window.seekTo`.
const _dureeAnimationParDefaut = 20.0;

class Simulation3dArgs {
  const Simulation3dArgs({required this.dossierId});

  final String dossierId;
}

class Simulation3dScreen extends ConsumerStatefulWidget {
  const Simulation3dScreen({super.key});

  @override
  ConsumerState<Simulation3dScreen> createState() => _Simulation3dScreenState();
}

class _Simulation3dScreenState extends ConsumerState<Simulation3dScreen> {
  WebViewController? _webViewController;
  String? _urlChargee;
  double _position = 0;

  /// La scène n'est pas publique : l'API fournit un lien signé à durée
  /// limitée (`sceneUrl`) vers la visionneuse, qu'on complète avec l'adresse
  /// de l'API pour le chargement des données.
  void _assurerWebView(String sceneUrl) {
    final baseUrl = ref.read(apiClientProvider).dio.options.baseUrl;
    final url = '$baseUrl$sceneUrl&apiBase=${Uri.encodeComponent(baseUrl)}';
    if (_urlChargee == url) return;
    _urlChargee = url;
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(url));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final args =
        ModalRoute.of(context)!.settings.arguments as Simulation3dArgs?;
    final dossierId = args?.dossierId;

    if (dossierId == null) {
      return Scaffold(body: Center(child: Text(t('sim3d_dossier_manquant'))));
    }

    final simulationAsync = ref.watch(simulation3dProvider(dossierId));

    return Scaffold(
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
                      t('profil_reconstitution_3d'),
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
            Expanded(
              child: simulationAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => _ErreurEtat(
                  message: t('sim3d_erreur_prefix').replaceFirst('%s', '$err'),
                  onReessayer: () =>
                      ref.invalidate(simulation3dProvider(dossierId)),
                ),
                data: (simulation) {
                  if (simulation == null) {
                    return _AucuneGenerationEtat(
                      onGenerer: () => ref
                          .read(simulation3dProvider(dossierId).notifier)
                          .declencher(),
                    );
                  }
                  if (simulation.echouee) {
                    return _ErreurEtat(
                      message: simulation.erreur ?? t('sim3d_echec_generique'),
                      onReessayer: () => ref
                          .read(simulation3dProvider(dossierId).notifier)
                          .declencher(),
                    );
                  }
                  if (simulation.enCours) {
                    return const _EnCoursEtat();
                  }

                  final sceneUrl = simulation.sceneUrl;
                  if (sceneUrl == null) {
                    return Center(child: Text(t('sim3d_echec_generique')));
                  }
                  _assurerWebView(sceneUrl);
                  return _SceneEtat(
                    controller: _webViewController!,
                    position: _position,
                    onPositionChanged: (valeur) {
                      setState(() => _position = valeur);
                      _webViewController?.runJavaScript(
                        'window.seekTo && window.seekTo(${valeur * _dureeAnimationParDefaut})',
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AucuneGenerationEtat extends StatelessWidget {
  const _AucuneGenerationEtat({required this.onGenerer});

  final VoidCallback onGenerer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.view_in_ar_outlined, size: 48, color: context.textMuted),
            const SizedBox(height: AppSpacing.md),
            Text(
              t('sim3d_aucune_generation'),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton.icon(
              onPressed: onGenerer,
              icon: const Icon(Icons.play_arrow, size: 18),
              label: Text(t('sim3d_generer')),
            ),
          ],
        ),
      ),
    );
  }
}

class _EnCoursEtat extends StatelessWidget {
  const _EnCoursEtat();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: AppSpacing.md),
          Text(t('sim3d_en_cours'), style: theme.textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _ErreurEtat extends StatelessWidget {
  const _ErreurEtat({required this.message, required this.onReessayer});

  final String message;
  final VoidCallback onReessayer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 40, color: theme.colorScheme.error),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            ElevatedButton(
              onPressed: onReessayer,
              child: Text(t('sim3d_reessayer')),
            ),
          ],
        ),
      ),
    );
  }
}

class _SceneEtat extends StatelessWidget {
  const _SceneEtat({
    required this.controller,
    required this.position,
    required this.onPositionChanged,
  });

  final WebViewController controller;
  final double position;
  final ValueChanged<double> onPositionChanged;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(child: WebViewWidget(controller: controller)),
        Positioned(
          left: AppSpacing.sm,
          right: AppSpacing.sm,
          bottom: AppSpacing.sm,
          child: _BottomPanel(position: position, onChanged: onPositionChanged),
        ),
      ],
    );
  }
}

class _BottomPanel extends StatelessWidget {
  const _BottomPanel({required this.position, required this.onChanged});

  final double position;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final tSecondes = position * _dureeAnimationParDefaut;
    final compact = MediaQuery.sizeOf(context).height < 420;

    return Container(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        compact ? AppSpacing.xs : AppSpacing.md,
        AppSpacing.lg,
        compact ? AppSpacing.xs : AppSpacing.lg,
      ),
      decoration: BoxDecoration(
        color: context.surfaceColor.withValues(alpha: 0.97),
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        border: Border.all(color: context.borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: theme.colorScheme.primary,
                    width: 2,
                  ),
                ),
                child: Icon(
                  Icons.play_arrow,
                  color: theme.colorScheme.primary,
                  size: 16,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  t('sim3d_scenario'),
                  style: theme.textTheme.titleSmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: context.elevatedSurfaceColor,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Text(
                  't = ${tSecondes.toStringAsFixed(1)}s',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: theme.colorScheme.primary,
              inactiveTrackColor: context.borderColor,
              thumbColor: theme.colorScheme.primary,
              thumbShape: RoundSliderThumbShape(
                enabledThumbRadius: compact ? 6 : 8,
              ),
              overlayShape: RoundSliderOverlayShape(
                overlayRadius: compact ? 10 : 14,
              ),
            ),
            child: SizedBox(
              height: compact ? 24 : null,
              child: Slider(value: position, onChanged: onChanged),
            ),
          ),
          if (!compact)
            Row(
              children: [
                Expanded(
                  child: Text(
                    t('sim3d_pre_impact'),
                    style: theme.textTheme.bodySmall,
                  ),
                ),
                Expanded(
                  child: Text(
                    t('sim3d_collision'),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    t('sim3d_post_impact'),
                    textAlign: TextAlign.right,
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
