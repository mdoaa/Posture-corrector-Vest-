/// Centralized configuration for backend connection
class AppConfig {
  /// Base URL for the Node.js backend API
  static const String apiBaseUrl = 'https://sitx-backend-new.onrender.com';

  /// WebSocket URL for real-time connections
  static const String webSocketUrl = 'https://sitx-backend-new.onrender.com';

  /// Socket.IO configuration options
  static final Map<String, dynamic> socketIOOptions = <String, dynamic>{
    'transports': ['websocket'],
    'autoConnect': true,
  };
}

