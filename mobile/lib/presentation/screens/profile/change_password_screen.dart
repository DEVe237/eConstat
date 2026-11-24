import 'package:flutter/material.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../widgets/app_form_field.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _actuelCtrl = TextEditingController();
  final _nouveauCtrl = TextEditingController();
  final _confirmationCtrl = TextEditingController();
  bool _enregistrement = false;

  @override
  void dispose() {
    _actuelCtrl.dispose();
    _nouveauCtrl.dispose();
    _confirmationCtrl.dispose();
    super.dispose();
  }

  Future<void> _valider(String Function(String) t) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _enregistrement = true);
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    setState(() => _enregistrement = false);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(t('pwd_succes'))));
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
                        t('pwd_titre'),
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineLarge,
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                AppFormField(
                  label: t('pwd_actuel'),
                  controller: _actuelCtrl,
                  icon: Icons.lock_outline,
                  obscureText: true,
                  validator: (v) =>
                      (v == null || v.isEmpty) ? t('commun_requis') : null,
                ),
                const SizedBox(height: AppSpacing.md),
                AppFormField(
                  label: t('pwd_nouveau'),
                  controller: _nouveauCtrl,
                  icon: Icons.lock_outline,
                  obscureText: true,
                  validator: (v) => (v == null || v.length < 8)
                      ? t('register_mdp_court')
                      : null,
                ),
                const SizedBox(height: AppSpacing.md),
                AppFormField(
                  label: t('pwd_confirmer'),
                  controller: _confirmationCtrl,
                  icon: Icons.lock_outline,
                  obscureText: true,
                  validator: (v) => v != _nouveauCtrl.text
                      ? t('pwd_erreur_correspondance')
                      : null,
                ),
                const SizedBox(height: AppSpacing.xxl),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(46),
                  ),
                  onPressed: _enregistrement ? null : () => _valider(t),
                  child: _enregistrement
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(t('pwd_maj')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
