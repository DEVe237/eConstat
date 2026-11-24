import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_extension.dart';
import '../../state/auth_notifier.dart';
import '../../state/language_provider.dart';
import '../../widgets/auth/auth_widgets.dart';
import '../profile/language_settings_screen.dart';
import '../profile/legal_screen.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _prenomCtrl = TextEditingController();
  final _nomCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _telephoneCtrl = TextEditingController();
  final _permisCtrl = TextEditingController();
  final _motDePasseCtrl = TextEditingController();
  bool _visible = false;
  bool _cguAcceptees = false;
  bool _erreurCgu = false;

  @override
  void dispose() {
    _prenomCtrl.dispose();
    _nomCtrl.dispose();
    _emailCtrl.dispose();
    _telephoneCtrl.dispose();
    _permisCtrl.dispose();
    _motDePasseCtrl.dispose();
    super.dispose();
  }

  Future<void> _creerCompte(String Function(String) t) async {
    if (!_formKey.currentState!.validate()) return;
    if (!_cguAcceptees) {
      setState(() => _erreurCgu = true);
      return;
    }

    await ref
        .read(authNotifierProvider.notifier)
        .inscription(
          nom: _nomCtrl.text.trim(),
          prenom: _prenomCtrl.text.trim(),
          email: _emailCtrl.text.trim(),
          motDePasse: _motDePasseCtrl.text,
          telephone: _telephoneCtrl.text.trim(),
          permisConduire: _permisCtrl.text.trim().isEmpty
              ? null
              : _permisCtrl.text.trim(),
        );
    final etat = ref.read(authNotifierProvider);
    if (etat.hasError && mounted) {
      final erreur = etat.error.toString();
      final message = erreur.contains('409') || erreur.contains('Conflict')
          ? t('register_erreur_conflit')
          : t('register_erreur_generique');
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } else if (mounted && !etat.hasError) {
      Navigator.pop(context);
    }
  }

  void _ouvrirLegal(
    String titre,
    List<LegalSection> sections,
    String miseAJour,
  ) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LegalScreen(
          title: titre,
          sections: sections,
          derniereMiseAJour: miseAJour,
        ),
      ),
    );
  }

  void _ouvrirSelecteurLangue() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => const LanguagePreferenceSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final loading = ref.watch(authNotifierProvider).isLoading;
    final langue = ref.watch(languageProvider);
    final t = AppStrings.of(context).t;

    return AuthScaffold(
      child: AuthCard(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Expanded(child: AuthTopBar()),
                  InkWell(
                    onTap: _ouvrirSelecteurLangue,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        border: Border.all(color: context.borderColor),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            langue == 'English' ? '🇬🇧' : '🇫🇷',
                            style: const TextStyle(fontSize: 16),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.expand_more,
                            size: 16,
                            color: context.textMuted,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              AuthTitle(
                title: t('register_titre'),
                prompt: t('register_prompt'),
                actionLabel: t('register_action'),
                onAction: () => Navigator.pop(context),
              ),
              const SizedBox(height: AppSpacing.xl),
              CommunityInput(
                controller: _prenomCtrl,
                label: t('register_prenom'),
                icon: Icons.person_outline_rounded,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? t('commun_requis') : null,
              ),
              const SizedBox(height: AppSpacing.md),
              CommunityInput(
                controller: _nomCtrl,
                label: t('register_nom'),
                icon: Icons.person_outline_rounded,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? t('commun_requis') : null,
              ),
              const SizedBox(height: AppSpacing.md),
              CommunityInput(
                controller: _emailCtrl,
                label: t('register_email'),
                icon: Icons.mail_outline_rounded,
                keyboardType: TextInputType.emailAddress,
                validator: (v) => (v == null || !v.contains('@'))
                    ? t('commun_email_invalide')
                    : null,
              ),
              const SizedBox(height: AppSpacing.md),
              CommunityInput(
                controller: _telephoneCtrl,
                label: t('register_telephone'),
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? t('commun_requis') : null,
              ),
              const SizedBox(height: AppSpacing.md),
              CommunityInput(
                controller: _permisCtrl,
                label: t('register_permis'),
                icon: Icons.badge_outlined,
              ),
              const SizedBox(height: AppSpacing.md),
              CommunityInput(
                controller: _motDePasseCtrl,
                label: t('register_mot_de_passe'),
                icon: Icons.lock_outline_rounded,
                obscureText: !_visible,
                suffix: IconButton(
                  icon: Icon(
                    _visible
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    size: 20,
                  ),
                  onPressed: () => setState(() => _visible = !_visible),
                ),
                validator: (v) => (v == null || v.length < 8)
                    ? t('register_mdp_court')
                    : null,
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: Checkbox(
                      value: _cguAcceptees,
                      onChanged: (v) => setState(() {
                        _cguAcceptees = v ?? false;
                        _erreurCgu = false;
                      }),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(5),
                      ),
                      side: BorderSide(
                        color: _erreurCgu
                            ? theme.colorScheme.error
                            : context.borderColor,
                        width: 1.5,
                      ),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: AuthLegalNotice(
                      textAlign: TextAlign.left,
                      termsTap: () => _ouvrirLegal(
                        t('parametres_cgu'),
                        conditionsUtilisation,
                        conditionsUtilisationMiseAJour,
                      ),
                      privacyTap: () => _ouvrirLegal(
                        t('parametres_confidentialite'),
                        politiqueConfidentialite,
                        politiqueConfidentialiteMiseAJour,
                      ),
                    ),
                  ),
                ],
              ),
              if (_erreurCgu) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  t('register_cgu_erreur'),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              AuthPrimaryButton(
                label: t('register_bouton'),
                onPressed: () => _creerCompte(t),
                isLoading: loading,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
