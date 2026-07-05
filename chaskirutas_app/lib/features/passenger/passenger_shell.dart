import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'passenger_home_view.dart';
import '../collectives/collectives_view.dart';
import '../profile/profile_view.dart';
import '../../core/theme.dart';

class PassengerShell extends ConsumerStatefulWidget {
  const PassengerShell({super.key});

  @override
  ConsumerState<PassengerShell> createState() => _PassengerShellState();
}

class _PassengerShellState extends ConsumerState<PassengerShell> {
  int _currentIndex = 0;

  static const List<_NavTab> _tabs = [
    _NavTab(icon: Icons.map_outlined,           activeIcon: Icons.map_rounded,              label: 'Inicio'),
    _NavTab(icon: Icons.airport_shuttle_outlined, activeIcon: Icons.airport_shuttle_rounded, label: 'Colectivos'),
    _NavTab(icon: Icons.person_outline_rounded,  activeIcon: Icons.person_rounded,           label: 'Perfil'),
  ];

  static const List<Widget> _pages = [
    PassengerHomeView(),
    CollectivesView(),
    ProfileView(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      // Only show AppBar on non-map tabs
      appBar: _currentIndex == 0
          ? null
          : AppBar(title: Text(_tabs[_currentIndex].label)),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: KeyedSubtree(
          key: ValueKey(_currentIndex),
          child: _pages[_currentIndex],
        ),
      ),
      bottomNavigationBar: _ChaskiBottomNav(
        currentIndex: _currentIndex,
        tabs: _tabs,
        accentColor: ChaskiTheme.primary,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}

// ── Shared bottom nav widget ──────────────────────────────────────────────────

class _NavTab {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavTab({required this.icon, required this.activeIcon, required this.label});
}

class _ChaskiBottomNav extends StatelessWidget {
  final int currentIndex;
  final List<_NavTab> tabs;
  final Color accentColor;
  final ValueChanged<int> onTap;

  const _ChaskiBottomNav({
    required this.currentIndex,
    required this.tabs,
    required this.accentColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: ChaskiTheme.surface,
        border: const Border(top: BorderSide(color: ChaskiTheme.border, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(tabs.length, (i) {
              final selected = i == currentIndex;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  splashColor: accentColor.withOpacity(0.15),
                  highlightColor: Colors.transparent,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          decoration: BoxDecoration(
                            color: selected ? accentColor.withOpacity(0.15) : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            selected ? tabs[i].activeIcon : tabs[i].icon,
                            color: selected ? accentColor : ChaskiTheme.textSecondary,
                            size: 24,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          tabs[i].label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                            color: selected ? accentColor : ChaskiTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
