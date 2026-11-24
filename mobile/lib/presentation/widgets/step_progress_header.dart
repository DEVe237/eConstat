import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_extension.dart';

enum StepProgressHeaderVariant { labels, numbered }

class StepProgressHeader extends StatelessWidget {
  const StepProgressHeader({
    super.key,
    required this.currentStep,
    this.labels = const ['Photos', 'Formulaire', 'Signature'],
    this.variant = StepProgressHeaderVariant.labels,
  });

  final int currentStep;
  final List<String> labels;
  final StepProgressHeaderVariant variant;

  @override
  Widget build(BuildContext context) {
    return switch (variant) {
      StepProgressHeaderVariant.labels => _LabelsHeader(
        currentStep: currentStep,
        labels: labels,
      ),
      StepProgressHeaderVariant.numbered => _NumberedHeader(
        currentStep: currentStep,
        labels: labels,
      ),
    };
  }
}

class _LabelsHeader extends StatelessWidget {
  const _LabelsHeader({required this.currentStep, required this.labels});

  final int currentStep;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.xs,
      ),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            Expanded(
              child: Column(
                children: [
                  Text(
                    labels[i],
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: i == currentStep
                          ? theme.colorScheme.primary
                          : context.textMuted,
                      fontWeight: i == currentStep
                          ? FontWeight.w700
                          : FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Container(
                    height: 5,
                    decoration: BoxDecoration(
                      color: i <= currentStep
                          ? theme.colorScheme.primary
                          : context.borderColor,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                  ),
                ],
              ),
            ),
            if (i != labels.length - 1) const SizedBox(width: AppSpacing.md),
          ],
        ],
      ),
    );
  }
}

class _NumberedHeader extends StatelessWidget {
  const _NumberedHeader({required this.currentStep, required this.labels});

  final int currentStep;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.sm,
      ),
      child: Column(
        children: [
          Row(
            children: [
              for (var i = 0; i < labels.length; i++) ...[
                Expanded(
                  child: Column(
                    children: [
                      _StepMarker(index: i + 1, state: _resolveState(i)),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        labels[i],
                        textAlign: TextAlign.center,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: i <= currentStep
                              ? (i == currentStep
                                    ? theme.colorScheme.primary
                                    : context.textSecondary)
                              : context.textMuted,
                          fontWeight: i == currentStep
                              ? FontWeight.w700
                              : FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (i != labels.length - 1)
                  const SizedBox(width: AppSpacing.sm),
              ],
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              for (var i = 0; i < labels.length; i++) ...[
                Expanded(
                  child: Container(
                    height: 5,
                    decoration: BoxDecoration(
                      color: i <= currentStep
                          ? theme.colorScheme.primary
                          : context.borderColor,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                  ),
                ),
                if (i != labels.length - 1)
                  const SizedBox(width: AppSpacing.md),
              ],
            ],
          ),
        ],
      ),
    );
  }

  _StepState _resolveState(int index) {
    if (index < currentStep) return _StepState.done;
    if (index == currentStep) return _StepState.current;
    return _StepState.upcoming;
  }
}

enum _StepState { done, current, upcoming }

class _StepMarker extends StatelessWidget {
  const _StepMarker({required this.index, required this.state});

  final int index;
  final _StepState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final background = switch (state) {
      _StepState.done || _StepState.current => theme.colorScheme.primary,
      _StepState.upcoming => context.borderColor,
    };
    final foreground = switch (state) {
      _StepState.done || _StepState.current => Colors.white,
      _StepState.upcoming => context.textMuted,
    };

    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(color: background, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: state == _StepState.done
          ? const Icon(Icons.check, size: 16, color: Colors.white)
          : Text(
              '$index',
              style: theme.textTheme.labelMedium?.copyWith(
                color: foreground,
                fontWeight: FontWeight.w700,
              ),
            ),
    );
  }
}
