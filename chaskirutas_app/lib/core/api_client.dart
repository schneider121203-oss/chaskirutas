import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';

class ApiClient {
  late final Dio dio;
  final secureStorage = const FlutterSecureStorage();

  // Toggle this to switch between local development and AWS production
  static const bool useAwsBackend = false;
  static const String awsBaseUrl = 'http://100.28.130.167:3000/api';

  // Resolves the backend host depending on Android/iOS Emulator vs physical device
  static String get defaultBaseUrl {
    if (useAwsBackend) return awsBaseUrl;
    if (kIsWeb) return 'http://localhost:3000/api';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api'; // Android Emulator loopback to host
    }
    return 'http://localhost:3000/api'; // iOS Simulator & others
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
                final refreshDio = Dio(BaseOptions(baseUrl: dio.options.baseUrl));
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
