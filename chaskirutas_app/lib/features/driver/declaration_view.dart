import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../auth/auth_provider.dart';

/// Declaración Jurada TUC — datos autocompletados desde la cuenta del conductor.
/// El conductor solo completa los campos faltantes y acepta bajo juramento.
class DeclarationView extends ConsumerStatefulWidget {
  const DeclarationView({super.key});

  @override
  ConsumerState<DeclarationView> createState() => _DeclarationViewState();
}

class _DeclarationViewState extends ConsumerState<DeclarationView> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  bool _submitting = false;
  bool _accepted = false;
  String? _error;

  final _engineController = TextEditingController();
  final _colorController = TextEditingController();
  final _atuController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _engineController.dispose();
    _colorController.dispose();
    _atuController.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    final client = ref.read(apiClientProvider);
    try {
      final res = await client.dio.get('/drivers/me/declaration');
      final d = res.data as Map<String, dynamic>;
      // Prefill de campos manuales si ya existían.
      _engineController.text = d['vehiculo']?['numeroMotor']?.toString() ?? '';
      _colorController.text = d['vehiculo']?['color']?.toString() ?? '';
      _atuController.text = d['empresa']?['autorizacionAtu']?.toString() ?? '';
      setState(() {
        _data = d;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'No se pudo cargar la declaración';
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    if (!_accepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Debes aceptar la declaración bajo juramento'), backgroundColor: ChaskiTheme.warning),
      );
      return;
    }
    setState(() => _submitting = true);
    final client = ref.read(apiClientProvider);
    try {
      await client.dio.post('/drivers/me/declaration', data: {
        'engineNumber': _engineController.text.trim(),
        'color': _colorController.text.trim(),
        'atuAuthorization': _atuController.text.trim(),
        'acceptedUnderOath': true,
      });
      await ref.read(authProvider.notifier).fetchProfile();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Declaración Jurada TUC firmada con éxito'), backgroundColor: Colors.green),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      setState(() => _submitting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al firmar la declaración'), backgroundColor: ChaskiTheme.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      appBar: AppBar(title: const Text('Declaración Jurada — TUC')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: ChaskiTheme.primary))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: ChaskiTheme.danger)))
              : _buildForm(),
    );
  }

  Widget _buildForm() {
    final d = _data!;
    final c = d['conductor'] ?? {};
    final e = d['empresa'] ?? {};
    final v = d['vehiculo'] ?? {};
    final pago = d['pago'] ?? {};
    final declaraciones = (d['declaraciones'] as List?) ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Obligatoria para obtener la Tarjeta Única de Circulación (TUC) ante la ATU. '
            'Los datos ya están precargados desde tu cuenta.',
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 16),

          _section('1. Datos del conductor', [
            _row('Nombres', c['nombresCompletos']),
            _row('DNI', c['dni']),
            _row('Domicilio (RENIEC)', c['domicilioFiscal']),
            _row('Teléfono', c['telefono']),
            _row('Correo', c['correo']),
            _row('Licencia', c['licenciaNumero']),
            _row('Categoría', c['licenciaCategoria']),
          ]),

          _section('2. Empresa de transporte', [
            _row('Razón social', e['razonSocial']),
            _row('RUC', e['ruc']),
            _row('Representante legal', e['representanteLegal']),
            _row('Dirección', e['direccion']),
          ]),

          _section('3. Vehículo', [
            _row('Placa', v['placa']),
            _row('Marca / Modelo', v['marcaModelo']),
            _row('Año', v['anio']?.toString()),
            _row('Tarjeta de propiedad', v['tarjetaPropiedad']),
            _row('SOAT vigente hasta', v['soatVigenteHasta']),
            _row('CITV aprobado hasta', v['citvAprobadoHasta']),
          ]),

          // Campos manuales
          const SizedBox(height: 8),
          const Text('Completa estos datos:', style: TextStyle(fontWeight: FontWeight.bold, color: ChaskiTheme.primary)),
          const SizedBox(height: 12),
          TextField(controller: _colorController, decoration: const InputDecoration(labelText: 'Color del vehículo')),
          const SizedBox(height: 10),
          TextField(controller: _engineController, decoration: const InputDecoration(labelText: 'N° de motor')),
          const SizedBox(height: 10),
          TextField(controller: _atuController, decoration: const InputDecoration(labelText: 'N° autorización ATU (opcional)')),

          const SizedBox(height: 20),
          _section('Pago de derecho de trámite', [
            _row('Concepto', pago['concepto']),
            _row('Monto', pago['monto'] != null ? 'S/ ${pago['monto']}' : null),
            _row('Estado', pago['estado']),
          ]),

          const SizedBox(height: 16),
          const Text('Declaro bajo juramento que:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...declaraciones.map((t) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text('• $t', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              )),

          const SizedBox(height: 8),
          CheckboxListTile(
            value: _accepted,
            onChanged: (val) => setState(() => _accepted = val ?? false),
            activeColor: ChaskiTheme.primary,
            contentPadding: EdgeInsets.zero,
            title: const Text('He leído y acepto todas las declaraciones bajo juramento.', style: TextStyle(fontSize: 13)),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: const Icon(Icons.draw_rounded),
            label: _submitting ? const Text('Firmando…') : const Text('Firmar Declaración Jurada'),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> rows) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: ChaskiTheme.glassDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: ChaskiTheme.primary)),
          const SizedBox(height: 10),
          ...rows,
        ],
      ),
    );
  }

  Widget _row(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 140, child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13))),
          Expanded(
            child: Text(
              (value == null || value.toString().isEmpty) ? '— (pendiente)' : value.toString(),
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
