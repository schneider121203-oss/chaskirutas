import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_provider.dart';
import '../auth/login_view.dart';
import 'edit_profile_view.dart';
import 'contacts_view.dart';
import '../driver/driver_profile_view.dart';
import '../driver/driver_vehicle_view.dart';
import '../trips/history_view.dart';
import '../payments/payment_methods_view.dart';
import '../../core/theme.dart';

class ProfileView extends ConsumerWidget {
  const ProfileView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final profile = authState.userProfile;
    final fullName = profile?['fullName'] ?? 'Usuario';
    final phone = profile?['phone'] ?? '';
    final dni = profile?['dni'] ?? '--';
    final role = authState.userRole;
    final isDriver = role == 'CONDUCTOR';

    // Initials for avatar
    final nameParts = fullName.toString().split(' ');
    final initials = nameParts.length >= 2
        ? '${nameParts[0][0]}${nameParts[1][0]}'.toUpperCase()
        : fullName.toString().substring(0, fullName.toString().length.clamp(1, 2)).toUpperCase();

    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      body: Container(
        decoration: const BoxDecoration(gradient: ChaskiTheme.backgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 32),

                // ── Avatar + name ──────────────────────────────────────────
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          gradient: isDriver
                              ? ChaskiTheme.conductorGradient
                              : ChaskiTheme.primaryGradient,
                          shape: BoxShape.circle,
                          boxShadow: isDriver
                              ? ChaskiTheme.conductorGlow
                              : ChaskiTheme.primaryGlow,
                        ),
                        child: Center(
                          child: Text(
                            initials,
                            style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        fullName,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: ChaskiTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: isDriver
                              ? ChaskiTheme.conductorGradient
                              : ChaskiTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          isDriver ? '🚗  CONDUCTOR' : '🧑  PASAJERO',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 36),

                // ── Info cards ─────────────────────────────────────────────
                _InfoCard(
                  icon: Icons.phone_iphone_rounded,
                  label: 'Número de celular',
                  value: phone,
                  iconColor: ChaskiTheme.accent,
                ),
                const SizedBox(height: 12),
                _InfoCard(
                  icon: Icons.badge_rounded,
                  label: 'DNI',
                  value: dni,
                  iconColor: ChaskiTheme.warning,
                ),
                const SizedBox(height: 12),
                _InfoCard(
                  icon: Icons.verified_user_rounded,
                  label: 'Estado de cuenta',
                  value: profile?['status'] ?? 'ACTIVO',
                  iconColor: ChaskiTheme.accent,
                ),

                if (isDriver) ...[
                  const SizedBox(height: 12),
                  _InfoCard(
                    icon: Icons.directions_car_rounded,
                    label: 'Estado de formalización',
                    value: profile?['driver']?['status'] ?? 'EN_REGISTRO',
                    iconColor: ChaskiTheme.secondary,
                  ),
                ],

                const SizedBox(height: 24),

                // ── Options Menu ───────────────────────────────────────────
                _MenuButton(
                  icon: Icons.edit_rounded,
                  label: 'Editar Perfil',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const EditProfileView()),
                    );
                  },
                ),
                if (!isDriver) ...[
                  const SizedBox(height: 12),
                  _MenuButton(
                    icon: Icons.sos_rounded,
                    label: 'Contactos de Emergencia (SOS)',
                    iconColor: ChaskiTheme.danger,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ContactsView()),
                      );
                    },
                  ),
                ],
                if (isDriver) ...[
                  const SizedBox(height: 12),
                  _MenuButton(
                    icon: Icons.account_balance_rounded,
                    label: 'Cuenta Bancaria',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const DriverProfileView()),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  _MenuButton(
                    icon: Icons.directions_car_rounded,
                    label: 'Mi Vehículo',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const DriverVehicleView()),
                      );
                    },
                  ),
                ],
                const SizedBox(height: 12),
                _MenuButton(
                  icon: Icons.history_rounded,
                  label: 'Historial de Viajes',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const HistoryView()),
                    );
                  },
                ),
                if (!isDriver) ...[
                  const SizedBox(height: 12),
                  _MenuButton(
                    icon: Icons.credit_card_rounded,
                    label: 'Mis Tarjetas (Pagos)',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const PaymentMethodsView()),
                      );
                    },
                  ),
                ],

                const SizedBox(height: 32),

                // ── Divider ────────────────────────────────────────────────
                Container(height: 1, color: ChaskiTheme.border),
                const SizedBox(height: 24),

                // ── Logout ─────────────────────────────────────────────────
                GestureDetector(
                  onTap: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (_) => AlertDialog(
                        backgroundColor: ChaskiTheme.cardColor,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        title: const Text('Cerrar sesión',
                            style: TextStyle(color: ChaskiTheme.textPrimary, fontWeight: FontWeight.w700)),
                        content: const Text(
                          '¿Estás seguro que quieres salir de tu cuenta?',
                          style: TextStyle(color: ChaskiTheme.textSecondary),
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('Cancelar'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('Salir',
                                style: TextStyle(color: ChaskiTheme.danger, fontWeight: FontWeight.w700)),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true && context.mounted) {
                      await ref.read(authProvider.notifier).logout();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const LoginView()),
                          (_) => false,
                        );
                      }
                    }
                  },
                  child: Container(
                    height: 56,
                    decoration: BoxDecoration(
                      color: ChaskiTheme.danger.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: ChaskiTheme.danger.withOpacity(0.4),
                        width: 1.5,
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.logout_rounded, color: ChaskiTheme.danger, size: 20),
                        SizedBox(width: 10),
                        Text(
                          'Cerrar Sesión',
                          style: TextStyle(
                            color: ChaskiTheme.danger,
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color iconColor;

  const _InfoCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: ChaskiTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ChaskiTheme.border, width: 1),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 12, color: ChaskiTheme.textSecondary),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: ChaskiTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? iconColor;
  final VoidCallback onTap;

  const _MenuButton({
    required this.icon,
    required this.label,
    this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = iconColor ?? ChaskiTheme.textPrimary;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: ChaskiTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: ChaskiTheme.border, width: 1),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: ChaskiTheme.textSecondary, size: 20),
          ],
        ),
      ),
    );
  }
}
