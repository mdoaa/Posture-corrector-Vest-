/// Centralized configuration for backend connection
class AppConfig {
  /// Production backend URL (Render)
  static const String prodBaseUrl = 'https://sitx-backend-new.onrender.com';


  static const String webSocketUrl = prodBaseUrl;

  /// Socket.IO configuration options
  static final Map<String, dynamic> socketIOOptions = <String, dynamic>{
    'transports': ['websocket'],
    'autoConnect': true,
  };
}

