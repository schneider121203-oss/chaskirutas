import 'package:flutter/material.dart';
import '../../core/theme.dart';

class RewardsView extends StatelessWidget {
  const RewardsView({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'ChaskiClub — Programa de Lealtad',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 8),
          const Text(
            'Acumula puntos por formalizar tus viajes y canjea cupones de descuento.',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          // Points score
          Card(
            color: ChaskiTheme.secondary.withOpacity(0.2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: ChaskiTheme.secondary, width: 1.5),
            ),
            child: const Padding(
              padding: EdgeInsets.all(24.0),
              child: Column(
                children: [
                  Text('Tus puntos acumulados', style: TextStyle(color: Colors.grey, fontSize: 16)),
                  SizedBox(height: 8),
                  Text(
                    '180 pts',
                    style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Nivel: Plata (1.2x multiplicador)',
                    style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Cupones disponibles para canjear:',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              children: [
                _buildCouponTile(context, 'PRIMERA (50% Off)', '50 pts', 'Cupón de bienvenida de 50% de descuento.'),
                _buildCouponTile(context, 'AMIGO10 (S/ 10 Off)', '40 pts', 'S/ 10 de descuento en cualquier viaje.'),
                _buildCouponTile(context, 'COLECTIVO15 (15% Off)', '30 pts', '15% de descuento en viajes interprovinciales.'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCouponTile(BuildContext context, String code, String points, String description) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(code, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: ChaskiTheme.primary)),
                  const SizedBox(height: 4),
                  Text(description, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('¡Cupón $code canjeado con éxito! Copia el código en tu viaje.'),
                    backgroundColor: Colors.green,
                  ),
                );
              },
              child: Text('Canjear ($points)'),
            )
          ],
        ),
      ),
    );
  }
}
