import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../widgets/app_form_field.dart';

/// Écran générique d'édition d'un document officiel (permis, assurance...).
/// [onSave] est optionnel : quand fourni (ex. permis de conduire, qui fait
/// partie du profil utilisateur), la valeur est persistée via ce callback ;
/// sinon la modification reste locale à cet écran (ex. assurance, qui n'a
/// pas encore de champ dédié côté compte).
class DocumentDetailScreen extends StatefulWidget {
  const DocumentDetailScreen({
    super.key,
    required this.title,
    required this.icon,
    required this.label,
    required this.initialValue,
    this.onSave,
  });

  final String title;
  final IconData icon;
  final String label;
  final String initialValue;
  final Future<void> Function(String valeur)? onSave;

  @override
  State<DocumentDetailScreen> createState() => _DocumentDetailScreenState();
}

class _DocumentDetailScreenState extends State<DocumentDetailScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _controller = TextEditingController(text: widget.initialValue);
  bool _enregistrement = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _enregistrer(String Function(String) t) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _enregistrement = true);
    await widget.onSave?.call(_controller.text.trim());
    if (!mounted) return;
    setState(() => _enregistrement = false);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(t('doc_succes'))));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.page,
            AppSpacing.lg,
            AppSpacing.page,
            AppSpacing.xxl,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
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
                        widget.title,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineLarge,
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                Center(
                  child: Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(
                        alpha: context.isDark ? 0.22 : 0.12,
                      ),
                      borderRadius: BorderRadius.circular(AppRadius.xl),
                    ),
                    child: Icon(
                      widget.icon,
                      size: 26,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                AppFormField(
                  label: widget.label,
                  controller: _controller,
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? t('commun_requis')
                      : null,
                ),
                const SizedBox(height: AppSpacing.xxl),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(46),
                  ),
                  onPressed: _enregistrement ? null : () => _enregistrer(t),
                  child: _enregistrement
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(t('doc_enregistrer')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
