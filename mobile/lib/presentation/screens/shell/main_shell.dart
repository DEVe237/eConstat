import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_strings.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../state/constat_draft_notifier.dart';
import '../historique/historique_screen.dart';
import '../home/home_screen.dart';
import '../profile/settings_screen.dart';
import '../profile/simulation3d_picker_screen.dart';
import '../urgence/urgence_screen.dart';

/// Coquille de navigation persistante (Accueil / Historique / Urgence /
/// Paramètres), avec un bouton flottant central "+" qui ouvre le menu
/// d'actions rapides — il reprend tout ce que contenait l'ancien menu
/// déroulant (Accueil, Profil, Paramètres, Urgences) plus Nouveau Constat et
/// Reconstitution 3D, au lieu de lancer directement la capture.
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _pageIndex = 0;

  static const _pages = [
    HomeScreen(),
    HistoriqueScreen(),
    UrgenceScreen(),
    SettingsScreen(afficherRetour: false),
  ];

  void _allerA(int index) {
    Navigator.pop(context);
    setState(() => _pageIndex = index);
  }

  void _nouveauConstat() {
    Navigator.pop(context);
    ref.read(constatDraftProvider.notifier).reset();
    Navigator.pushNamed(context, AppRoutes.capture);
  }

  void _ouvrirMenu() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => _QuickActionsSheet(
        onNouveauConstat: _nouveauConstat,
        onAccueil: () => _allerA(0),
        onProfil: () {
          Navigator.pop(context);
          Navigator.pushNamed(context, AppRoutes.profile);
        },
        onUrgences: () => _allerA(2),
        onParametres: () => _allerA(3),
        onReconstitution3d: () {
          Navigator.pop(context);
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const Simulation3dPickerScreen()),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _pageIndex, children: _pages),
      bottomNavigationBar: _FloatingNavBar(
        selectedIndex: _pageIndex,
        onSelected: (i) => setState(() => _pageIndex = i),
        onNouveau: _ouvrirMenu,
      ),
    );
  }
}

class _QuickActionsSheet extends StatelessWidget {
  const _QuickActionsSheet({
    required this.onNouveauConstat,
    required this.onAccueil,
    required this.onProfil,
    required this.onUrgences,
    required this.onParametres,
    required this.onReconstitution3d,
  });

  final VoidCallback onNouveauConstat;
  final VoidCallback onAccueil;
  final VoidCallback onProfil;
  final VoidCallback onUrgences;
  final VoidCallback onParametres;
  final VoidCallback onReconstitution3d;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = AppStrings.of(context).t;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          0,
          AppSpacing.lg,
          AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 0, 4, AppSpacing.sm),
              child: Text(
                t('menu_actions_rapides'),
                style: theme.textTheme.titleLarge,
              ),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                Icons.add_a_photo_outlined,
                color: theme.colorScheme.primary,
              ),
              title: Text(t('menu_nouveau_constat')),
              onTap: onNouveauConstat,
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                Icons.view_in_ar_outlined,
                color: theme.colorScheme.primary,
              ),
              title: Text(t('menu_reconstitution_3d')),
              onTap: onReconstitution3d,
            ),
            const Divider(),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.home_outlined),
              title: Text(t('nav_accueil')),
              onTap: onAccueil,
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.person_outline),
              title: Text(t('menu_profil')),
              onTap: onProfil,
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.settings_outlined),
              title: Text(t('nav_parametres')),
              onTap: onParametres,
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.emergency_outlined),
              title: Text(t('menu_urgences')),
              onTap: onUrgences,
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  const _NavItem({
    required this.icon,
    required this.selectedIcon,
    required this.labelCle,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String labelCle;
}

const _navItems = [
  _NavItem(
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
    labelCle: 'nav_accueil',
  ),
  _NavItem(
    icon: Icons.history_outlined,
    selectedIcon: Icons.history,
    labelCle: 'nav_historique',
  ),
  _NavItem(
    icon: Icons.emergency_outlined,
    selectedIcon: Icons.emergency,
    labelCle: 'nav_urgence',
  ),
  _NavItem(
    icon: Icons.settings_outlined,
    selectedIcon: Icons.settings,
    labelCle: 'nav_parametres',
  ),
];

/// Barre flottante sombre avec bouton central "+" en surplomb — un seul
/// bloc visuel volontairement toujours sombre (comme le modèle fourni),
/// indépendamment du thème clair/sombre de l'app, pour ne jamais se fondre
/// en blanc sur fond blanc.
class _FloatingNavBar extends StatelessWidget {
  const _FloatingNavBar({
    required this.selectedIndex,
    required this.onSelected,
    required this.onNouveau,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final VoidCallback onNouveau;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.sm,
        ),
        child: SizedBox(
          height: 72,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.bottomCenter,
            children: [
              Container(
                height: 60,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.violet900, Color(0xFF1A0A4D)],
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.xxxl),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.28),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _NavTile(
                        item: _navItems[0],
                        selected: selectedIndex == 0,
                        onTap: () => onSelected(0),
                      ),
                    ),
                    Expanded(
                      child: _NavTile(
                        item: _navItems[1],
                        selected: selectedIndex == 1,
                        onTap: () => onSelected(1),
                      ),
                    ),
                    const SizedBox(width: 56),
                    Expanded(
                      child: _NavTile(
                        item: _navItems[2],
                        selected: selectedIndex == 2,
                        onTap: () => onSelected(2),
                      ),
                    ),
                    Expanded(
                      child: _NavTile(
                        item: _navItems[3],
                        selected: selectedIndex == 3,
                        onTap: () => onSelected(3),
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                top: 0,
                child: GestureDetector(
                  onTap: onNouveau,
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.violet500, AppColors.violet700],
                      ),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Theme.of(context).scaffoldBackgroundColor,
                        width: 3,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.violet700.withValues(alpha: 0.5),
                          blurRadius: 14,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.add, color: Colors.white, size: 28),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _NavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected
        ? Colors.white
        : Colors.white.withValues(alpha: 0.55);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            selected ? item.selectedIcon : item.icon,
            size: 20,
            color: color,
          ),
          const SizedBox(height: 3),
          Text(
            AppStrings.of(context).t(item.labelCle),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              color: color,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
          const SizedBox(height: 3),
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            width: selected ? 16 : 0,
            height: 2.5,
            decoration: BoxDecoration(
              color: AppColors.yellow400,
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
          ),
        ],
      ),
    );
  }
}
