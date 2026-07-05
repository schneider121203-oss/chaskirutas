import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

class AuthState {
  final bool isLoading;
  final String? errorMessage;
  final Map<String, dynamic>? userProfile;
  final String? accessToken;

  AuthState({
    this.isLoading = false,
    this.errorMessage,
    this.userProfile,
    this.accessToken,
  });

  /// Returns 'CONDUCTOR' if the profile contains a driver sub-object or
  /// a CONDUCTOR role entry; otherwise returns 'PASAJERO'.
  String get userRole {
    if (userProfile == null) return 'PASAJERO';
    // If the profile has a 'driver' sub-object, the user is a conductor
    if (userProfile!['driver'] != null) return 'CONDUCTOR';
    // Check 'roles' array (list of {role: 'CONDUCTOR'} maps)
    final roles = userProfile!['roles'];
    if (roles is List) {
      for (final r in roles) {
        if (r is Map && r['role'] == 'CONDUCTOR') return 'CONDUCTOR';
        if (r is String && r == 'CONDUCTOR') return 'CONDUCTOR';
      }
    }
    return 'PASAJERO';
  }

  AuthState copyWith({
    bool? isLoading,
    String? errorMessage,
    Map<String, dynamic>? userProfile,
    String? accessToken,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      userProfile: userProfile ?? this.userProfile,
      accessToken: accessToken ?? this.accessToken,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(() => checkLocalSession());
    return AuthState();
  }

  Future<void> checkLocalSession() async {
    final client = ref.read(apiClientProvider);
    final token = await client.getAccessToken();
    if (token != null) {
      state = state.copyWith(accessToken: token);
      await fetchProfile();
    }
  }

  Future<bool> register({
    required String phone,
    required String password,
    required String fullName,
    required String dni,
    required String role,
    String? email,
    String? licenseNumber,
    String? licenseClass,
    String? licenseExpiresAt,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final client = ref.read(apiClientProvider);
    
    try {
      await client.dio.post('/auth/register', data: {
        'phone': phone,
        'password': password,
        'fullName': fullName,
        'dni': dni,
        'role': role,
        if (email != null) 'email': email,
        if (role == 'CONDUCTOR') ...{
          'licenseNumber': licenseNumber,
          'licenseClass': licenseClass,
          'licenseExpiresAt': licenseExpiresAt,
        }
      });
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      String msg = 'Error en el registro';
      if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
        final raw = (e as dynamic).response.data['message'];
        msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<Map<String, dynamic>?> sendOtp(String phone) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final client = ref.read(apiClientProvider);
    
    try {
      final res = await client.dio.post('/auth/otp/send', data: {'phone': phone});
      state = state.copyWith(isLoading: false);
      return res.data;
    } catch (e) {
      String msg = 'Error al enviar OTP';
      if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
        final raw = (e as dynamic).response.data['message'];
        msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return null;
    }
  }

  Future<bool> verifyOtp(String phone, String code) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final client = ref.read(apiClientProvider);
    
    try {
      final res = await client.dio.post('/auth/otp/verify', data: {
        'phone': phone,
        'code': code,
      });

      final access = res.data['accessToken'];
      final refresh = res.data['refreshToken'];
      final profile = res.data['user'];

      await client.saveTokens(access, refresh);

      state = state.copyWith(
        isLoading: false,
        accessToken: access,
        userProfile: profile,
      );
      return true;
    } catch (e) {
      String msg = 'Código OTP incorrecto';
      if ((e as dynamic).response != null && (e as dynamic).response.data != null) {
        final raw = (e as dynamic).response.data['message'];
        msg = (raw is List) ? raw.join(', ') : (raw?.toString() ?? msg);
      }
      state = state.copyWith(isLoading: false, errorMessage: msg);
      return false;
    }
  }

  Future<void> fetchProfile() async {
    final client = ref.read(apiClientProvider);
    try {
      final res = await client.dio.get('/auth/me');
      state = state.copyWith(userProfile: res.data);
    } catch (e) {
      logout();
    }
  }

  Future<void> logout() async {
    final client = ref.read(apiClientProvider);
    await client.clearTokens();
    state = AuthState();
  }
}

// Exposing via NotifierProvider compatible with modern Riverpod v3
final authProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});
