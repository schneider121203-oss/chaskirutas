import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/api_client.dart';
import '../auth/auth_provider.dart';

class ContactsView extends ConsumerStatefulWidget {
  const ContactsView({super.key});

  @override
  ConsumerState<ContactsView> createState() => _ContactsViewState();
}

class _ContactsViewState extends ConsumerState<ContactsView> {
  bool _isLoading = true;
  List<dynamic> _contacts = [];

  @override
  void initState() {
    super.initState();
    _fetchContacts();
  }

  Future<void> _fetchContacts() async {
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.dio.get('/users/me/contacts');
      if (mounted) {
        setState(() {
          _contacts = res.data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _addContact() async {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: ChaskiTheme.cardColor,
        title: const Text('Añadir Contacto SOS', style: TextStyle(color: ChaskiTheme.textPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Nombre'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Teléfono (ej: +51999888777)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (result == true && nameController.text.isNotEmpty && phoneController.text.isNotEmpty) {
      setState(() => _isLoading = true);
      try {
        final client = ref.read(apiClientProvider);
        await client.dio.post('/users/me/contacts', data: {
          'fullName': nameController.text.trim(),
          'phoneE164': phoneController.text.trim(),
        });
        await _fetchContacts();
      } catch (e) {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deleteContact(String id) async {
    setState(() => _isLoading = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.dio.delete('/users/me/contacts/$id');
      await _fetchContacts();
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChaskiTheme.background,
      appBar: AppBar(
        title: const Text('Contactos SOS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: _addContact,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _contacts.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: _contacts.length,
                  itemBuilder: (context, index) {
                    final contact = _contacts[index];
                    return _ContactCard(
                      name: contact['fullName'] ?? '',
                      phone: contact['phoneE164'] ?? '',
                      onDelete: () => _deleteContact(contact['id']),
                    );
                  },
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.health_and_safety_rounded, size: 64, color: ChaskiTheme.textSecondary.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            const Text(
              'Aún no tienes contactos de emergencia',
              textAlign: TextAlign.center,
              style: TextStyle(color: ChaskiTheme.textSecondary, fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _addContact,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Añadir mi primer contacto'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  final String name;
  final String phone;
  final VoidCallback onDelete;

  const _ContactCard({required this.name, required this.phone, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ChaskiTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ChaskiTheme.border, width: 1),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: ChaskiTheme.danger.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.sos_rounded, color: ChaskiTheme.danger, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: ChaskiTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  phone,
                  style: const TextStyle(fontSize: 14, color: ChaskiTheme.textSecondary),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: ChaskiTheme.textSecondary),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (_) => AlertDialog(
                  backgroundColor: ChaskiTheme.cardColor,
                  title: const Text('Eliminar contacto', style: TextStyle(color: ChaskiTheme.textPrimary)),
                  content: const Text('¿Estás seguro?', style: TextStyle(color: ChaskiTheme.textSecondary)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancelar'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Eliminar', style: TextStyle(color: ChaskiTheme.danger)),
                    ),
                  ],
                ),
              );
              if (confirm == true) onDelete();
            },
          ),
        ],
      ),
    );
  }
}
