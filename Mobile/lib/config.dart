/// Centralized configuration for backend connection
class AppConfig {
  /// Production backend URL (Render)
  static const String prodBaseUrl = 'https://sitx-backend-new.onrender.com';

  /// Local backend URL for development
  static const String localBaseUrl = 'http://localhost:8080';

  /// Toggle local/prod backend from one place.
  static const bool useLocalhost = false;

  /// Base URL for the Node.js backend API
  static const String apiBaseUrl = useLocalhost ? localBaseUrl : prodBaseUrl;

  /// WebSocket URL for real-time connections
  static const String webSocketUrl = apiBaseUrl;

  /// Socket.IO configuration options
  static final Map<String, dynamic> socketIOOptions = <String, dynamic>{
    'transports': ['websocket'],
    'autoConnect': true,
  };
}

