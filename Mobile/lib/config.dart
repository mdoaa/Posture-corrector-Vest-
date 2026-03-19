/// Centralized configuration for backend connection
class AppConfig {
  /// Base URL for the Node.js backend API
  static const String apiBaseUrl = 'http://192.168.1.9:8080';

  /// WebSocket URL for real-time connections
  static const String webSocketUrl ='http://192.168.1.9:8080';

  /// Socket.IO configuration options
  static final Map<String, dynamic> socketIOOptions = <String, dynamic>{
    'transports': ['websocket'],
    'autoConnect': true,
  };
}

