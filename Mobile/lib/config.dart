/// Centralized configuration for backend connection
class AppConfig {
  /// Production backend URL (Render)
  static const String prodBaseUrl = 'https://sitx-backhscnuksdhnkdend-new.onrender.com';

  /// Local backend URL for development
  static const String localBaseUrl = 'http://172.27.32.1:8080';

  /// Toggle local/prod backend from one place.
  static const bool useLocalhost = true;

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

