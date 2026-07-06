import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/api_client.dart';

class RatingView extends ConsumerStatefulWidget {
  final String bookingId; // el backend califica por bookingId (POST /trips/:bookingId/rate)
  final String targetName; // e.g. "Juan (Conductor)"

  const RatingView({super.key, required this.bookingId, required this.targetName});

  @override
  ConsumerState<RatingView> createState() => _RatingViewState();
}

class _RatingViewState extends ConsumerState<RatingView> {
  int _rating = 0;
  final _commentController = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Por favor, selecciona una calificación (1-5)'),
          backgroundColor: ChaskiTheme.warning,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final client = ref.read(apiClientProvider);
      await client.dio.post('/trips/${widget.bookingId}/rate', data: {
        'score': _rating,
        'comment': _commentController.text.trim(),
      });

      if (mounted) {
        Navigator.pop(context, true); // True implies success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Error al enviar la calificación'),
            backgroundColor: ChaskiTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: ChaskiTheme.cardColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: ChaskiTheme.border, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.5),
              blurRadius: 24,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.star_rounded, size: 56, color: ChaskiTheme.warning),
            const SizedBox(height: 16),
            const Text(
              '¿Qué tal estuvo el viaje?',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: ChaskiTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Califica a ${widget.targetName}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: ChaskiTheme.textSecondary),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final isSelected = index < _rating;
                return GestureDetector(
                  onTap: () => setState(() => _rating = index + 1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(
                      isSelected ? Icons.star_rounded : Icons.star_border_rounded,
                      size: 42,
                      color: isSelected ? ChaskiTheme.warning : ChaskiTheme.textSecondary,
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _commentController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Escribe un comentario (opcional)',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Enviar Calificación'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
