import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';

/// Entornos disponibles para apuntar la app. Ver [ApiClient.activeEnv].
enum BackendEnv { local, ngrok, aws }

class ApiClient {
  late final Dio dio;
  final secureStorage = const FlutterSecureStorage();

  // ── Configuración de entorno del backend ──────────────────────────────────
  // Cambia SOLO esta línea para elegir contra qué backend habla la app.
  static const BackendEnv activeEnv = BackendEnv.ngrok;

  // Pega aquí la URL https que te imprime Ngrok al correrlo (ver README /
  // instrucciones de terminal), terminada en `/api`, y cambia `activeEnv`
  // arriba a `BackendEnv.ngrok`. Ejemplo: 'https://abcd-1-2-3-4.ngrok-free.app/api'
  static const String ngrokBaseUrl = 'https://unlocked-scavenger-mace.ngrok-free.dev/api';

  static const String awsBaseUrl = 'http://100.28.130.167:3000/api';

  // Resolves the backend host depending on the active environment.
  static String get defaultBaseUrl {
    switch (activeEnv) {
      case BackendEnv.ngrok:
        return ngrokBaseUrl;
      case BackendEnv.aws:
        return awsBaseUrl;
      case BackendEnv.local:
        // En web, la app y la API se sirven desde el mismo origen (ver
        // ServeStaticModule en el backend), tanto en localhost como detrás
        // de un túnel de Ngrok.
        if (kIsWeb) return '${Uri.base.origin}/api';
        if (defaultTargetPlatform == TargetPlatform.android) {
          return 'http://10.0.2.2:3000/api'; // Android Emulator loopback to host
        }
        return 'http://localhost:3000/api'; // iOS Simulator & others
    }
  }

  ApiClient({String? baseUrl}) {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? defaultBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Evita la página de advertencia interstitial que Ngrok inyecta por
          // defecto en el plan gratuito (rompería el parseo JSON si no está).
          'ngrok-skip-browser-warning': 'true',
        },
      ),
    );

    // Add interceptor to auto-inject JWT token from secure storage
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await secureStorage.read(key: 'accessToken');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401 && error.requestOptions.path != '/auth/refresh') {
            final refreshToken = await secureStorage.read(key: 'refreshToken');
            
            if (refreshToken != null) {
              try {
                // Instanciar un Dio limpio para no disparar el interceptor recursivamente
                final refreshDio = Dio(BaseOptions(
                  baseUrl: dio.options.baseUrl,
                  headers: {'ngrok-skip-browser-warning': 'true'},
                ));
                final res = await refreshDio.post('/auth/refresh', data: {
                  'refreshToken': refreshToken
                });

                final newAccessToken = res.data['accessToken'];
                final newRefreshToken = res.data['refreshToken'];

                if (newAccessToken != null && newRefreshToken != null) {
                  await saveTokens(newAccessToken, newRefreshToken);
                  
                  // Reintentar la petición original con el nuevo token
                  final options = error.requestOptions;
                  options.headers['Authorization'] = 'Bearer $newAccessToken';
                  
                  final cloneReq = await refreshDio.request(
                    options.path,
                    options: Options(
                      method: options.method,
                      headers: options.headers,
                    ),
                    data: options.data,
                    queryParameters: options.queryParameters,
                  );
                  return handler.resolve(cloneReq);
                }
              } catch (e) {
                // Si el refresh falla (refresh token expirado o inválido), limpiar credenciales
                await clearTokens();
                // Opcional: Emitir algún evento global o recargar la app.
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<void> saveTokens(String access, String refresh) async {
    await secureStorage.write(key: 'accessToken', value: access);
    await secureStorage.write(key: 'refreshToken', value: refresh);
  }

  Future<void> clearTokens() async {
    await secureStorage.delete(key: 'accessToken');
    await secureStorage.delete(key: 'refreshToken');
  }

  Future<String?> getAccessToken() async {
    return secureStorage.read(key: 'accessToken');
  }
}
