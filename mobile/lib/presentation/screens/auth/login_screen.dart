import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../state/auth_notifier.dart';
import '../../widgets/auth/auth_widgets.dart';
import '../profile/legal_screen.dart';
import 'register_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _motDePasseCtrl = TextEditingController();
  bool _visible = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _motDePasseCtrl.dispose();
    super.dispose();
  }

  Future<void> _seConnecter(String Function(String) t) async {
    if (!_formKey.currentState!.validate()) return;
    await ref
        .read(authNotifierProvider.notifier)
        .connexion(
          email: _emailCtrl.text.trim(),
          motDePasse: _motDePasseCtrl.text,
        );
    final etat = ref.read(authNotifierProvider);
    if (etat.hasError && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(t('login_erreur'))));
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

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authNotifierProvider).isLoading;
    final t = AppStrings.of(context).t;

    return AuthScaffold(
      child: AuthCard(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const AuthTopBar(),
              const SizedBox(height: AppSpacing.xxl),
              AuthTitle(
                title: t('login_titre'),
                prompt: t('login_prompt'),
                actionLabel: t('login_action'),
                onAction: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const RegisterScreen()),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              CommunityInput(
                controller: _emailCtrl,
                label: t('login_email'),
                icon: Icons.mail_outline_rounded,
                keyboardType: TextInputType.emailAddress,
                validator: (v) => (v == null || !v.contains('@'))
                    ? t('commun_email_invalide')
                    : null,
              ),
              const SizedBox(height: AppSpacing.md),
              CommunityInput(
                controller: _motDePasseCtrl,
                label: t('login_mot_de_passe'),
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
                validator: (v) =>
                    (v == null || v.length < 6) ? t('login_mdp_court') : null,
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () {},
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 34),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(t('login_mdp_oublie')),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              AuthPrimaryButton(
                label: t('login_bouton'),
                onPressed: () => _seConnecter(t),
                isLoading: loading,
              ),
              const SizedBox(height: AppSpacing.xxl),
              const AuthDivider(),
              const SizedBox(height: AppSpacing.xxl),
              AuthLegalNotice(
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
            ],
          ),
        ),
      ),
    );
  }
}
