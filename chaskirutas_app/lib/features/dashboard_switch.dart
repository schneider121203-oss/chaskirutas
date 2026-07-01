import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth/auth_provider.dart';
import 'passenger/passenger_home_view.dart';
import 'driver/driver_home_view.dart';
import 'collectives/collectives_view.dart';
import 'rewards/rewards_view.dart';
import '../core/theme.dart';

class DashboardSwitch extends ConsumerStatefulWidget {
  const DashboardSwitch({super.key});

  @override
  ConsumerState<DashboardSwitch> createState() => _DashboardSwitchState();
}

class _DashboardSwitchState extends ConsumerState<DashboardSwitch> {
  String _currentView = 'PASAJERO'; // PASAJERO, CONDUCTOR, COLECTIVO, REWARDS

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final userProfile = authState.userProfile;
    final fullName = userProfile != null ? userProfile['fullName'] ?? 'Usuario' : 'Usuario';

    Widget body;
    String title;

    switch (_currentView) {
      case 'CONDUCTOR':
        body = const DriverHomeView();
        title = 'Modo Conductor';
        break;
      case 'COLECTIVO':
        body = const CollectivesView();
        title = 'Colectivo Interprovincial';
        break;
      case 'REWARDS':
        body = const RewardsView();
        title = 'Club ChaskiRutas';
        break;
      case 'PASAJERO':
      default:
        body = const PassengerHomeView();
        title = 'Solicitar Viaje';
        break;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        backgroundColor: ChaskiTheme.background,
        elevation: 0,
      ),
      drawer: Drawer(
        backgroundColor: ChaskiTheme.cardColor,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(color: ChaskiTheme.background),
              currentAccountPicture: const CircleAvatar(
                backgroundColor: ChaskiTheme.primary,
                child: Icon(Icons.person, size: 36, color: Colors.white),
              ),
              accountName: Text(fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              accountEmail: Text(userProfile != null ? userProfile['phone'] ?? '' : ''),
            ),
            ListTile(
              leading: const Icon(Icons.hail_rounded, color: Colors.amber),
              title: const Text('Modo Pasajero'),
              selected: _currentView == 'PASAJERO',
              onTap: () {
                setState(() => _currentView = 'PASAJERO');
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.drive_eta_rounded, color: Colors.indigoAccent),
              title: const Text('Modo Conductor'),
              selected: _currentView == 'CONDUCTOR',
              onTap: () {
                setState(() => _currentView = 'CONDUCTOR');
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.airport_shuttle_rounded, color: ChaskiTheme.primary),
              title: const Text('Colectivo Interprovincial'),
              selected: _currentView == 'COLECTIVO',
              onTap: () {
                setState(() => _currentView = 'COLECTIVO');
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.card_giftcard_rounded, color: Colors.green),
              title: const Text('Programa ChaskiClub'),
              selected: _currentView == 'REWARDS',
              onTap: () {
                setState(() => _currentView = 'REWARDS');
                Navigator.pop(context);
              },
            ),
            const Spacer(),
            const Divider(color: Colors.grey),
            ListTile(
              leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
              title: const Text('Cerrar Sesión'),
              onTap: () {
                ref.read(authProvider.notifier).logout();
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
      body: body,
    );
  }
}
