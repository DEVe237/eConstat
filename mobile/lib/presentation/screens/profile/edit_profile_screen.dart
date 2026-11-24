import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/network/erreurs.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/entities/utilisateur.dart';
import '../../state/auth_notifier.dart';
import '../../widgets/app_form_field.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _prenomCtrl = TextEditingController(text: _user?.prenom);
  late final _nomCtrl = TextEditingController(text: _user?.nom);
  late final _telephoneCtrl = TextEditingController(text: _user?.telephone);
  late final _adresseCtrl = TextEditingController(text: _user?.adresse);
  bool _enregistrement = false;

  Utilisateur? get _user => ref.read(authNotifierProvider).value;

  @override
  void dispose() {
    _prenomCtrl.dispose();
    _nomCtrl.dispose();
    _telephoneCtrl.dispose();
    _adresseCtrl.dispose();
    super.dispose();
  }

  Future<void> _enregistrer(String Function(String) t) async {
    if (!_formKey.currentState!.validate()) return;
    final user = _user;
    if (user == null) return;

    setState(() => _enregistrement = true);
    try {
      await ref
          .read(authNotifierProvider.notifier)
          .mettreAJourProfil(
            user.copyWith(
              prenom: _prenomCtrl.text.trim(),
              nom: _nomCtrl.text.trim(),
              telephone: _telephoneCtrl.text.trim(),
              adresse: _adresseCtrl.text.trim(),
            ),
          );
    } catch (e) {
      if (!mounted) return;
      setState(() => _enregistrement = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(messageServeur(e) ?? t('commun_echec_enregistrement'))),
      );
      return;
    }
    if (!mounted) return;
    setState(() => _enregistrement = false);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(t('editp_succes'))));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;
    final email = _user?.email ?? '';

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
                        t('editp_titre'),
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineLarge,
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                AppFormField(
                  label: t('editp_prenom'),
                  controller: _prenomCtrl,
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? t('commun_requis')
                      : null,
                ),
                const SizedBox(height: AppSpacing.md),
                AppFormField(
                  label: t('editp_nom'),
                  controller: _nomCtrl,
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? t('commun_requis')
                      : null,
                ),
                const SizedBox(height: AppSpacing.md),
                AppFormField(
                  label: t('editp_email'),
                  controller: TextEditingController(text: email),
                  icon: Icons.mail_outline,
                  enabled: false,
                ),
                const SizedBox(height: AppSpacing.md),
                AppFormField(
                  label: t('editp_telephone'),
                  controller: _telephoneCtrl,
                  icon: Icons.phone_outlined,
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: AppSpacing.md),
                AppFormField(
                  label: t('editp_adresse'),
                  controller: _adresseCtrl,
                  icon: Icons.home_outlined,
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
                      : Text(t('editp_enregistrer')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
