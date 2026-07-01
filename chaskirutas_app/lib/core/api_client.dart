import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';

class ApiClient {
  late final Dio dio;
  final secureStorage = const FlutterSecureStorage();

  // Toggle this to switch between local development and AWS production
  static const bool useAwsBackend = true;
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
          // Auto token refresh could be wired here if needed
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
