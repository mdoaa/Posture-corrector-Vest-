import 'dart:convert';
import 'package:get_storage/get_storage.dart';
import 'package:http/http.dart' as http;
// import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config.dart';

class Mongodb {
  String name;
  String email;
  String password;

  static const String baseUrl = AppConfig.apiBaseUrl;

  // static const String baseUrl = 'http://192.168.100.165:8080';
  // static const String baseUrl =
  //     'http://192.168.100.14:8080'; // Update with your backend URL
  // 192.168.100.14/check-email?email=rrahmeed4@yahoo.com
  // static const String baseUrl = 'http://192.168.1.150:8080';
  Mongodb({required this.name, required this.email, required this.password});

  // static Future<void> testFetchSpeed() async {
  //   final url = Uri.parse('$baseUrl/api/sensor/latest');

  //   final start = DateTime.now(); // Start timer

  //   try {
  //     final response = await http.get(url);

  //     final end = DateTime.now(); // End timer
  //     final duration = end.difference(start);

  //     if (response.statusCode == 200) {
  //       print('✅ Data fetched successfully.');
  //       print('⏱️ Fetch time: ${duration.inMilliseconds} ms');
  //     } else {
  //       print('❌ Failed to fetch data: ${response.statusCode}');
  //     }
  //   } catch (e) {
  //     print('❌ Error fetching data: $e');
  //   }
  // }

  static Future<bool> verifyOtp(String email, String otp) async {
    final url = Uri.parse('$baseUrl/verify-otp');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'otp': otp}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print("❌ Error verifying OTP: $e");
      return false;
    }
  }

  Future<void> adduser() async {
    final url = Uri.parse('$baseUrl/register');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': name,
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        print("✅ User added successfully!");
      } else {
        print("❌ Failed to add user: ${response.body}");
      }
    } catch (e) {
      print("❌ Error adding user: $e");
    }
  }

  static Future<bool> isEmailExsists(String email) async {
    final url = Uri.parse(
      '$baseUrl/check-email?email=$email',
    ); // Send email as Pquery parameter

    try {
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
        }, // GET requests can have headers
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['exists'] == true;
      } else {
        print(
          "❌ Failed to check email: ${response.statusCode} - ${response.body}",
        );
        return false;
      }
    } catch (e) {
      print("❌ Error checking email: $e");
      return false;
    }
  }

  static Future<bool> sendOtp(String email) async {
    final url = Uri.parse('$baseUrl/send-otp');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print("❌ Error sending OTP: $e");
      return false;
    }
  }

  static Future<String?> isAccountExists(String email, String password) async {
    final url = Uri.parse('$baseUrl/login');

    try {
      print("🔄 Attempting login to: $url");
      print("📧 Email: $email");

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      print("📥 Response Status Code: ${response.statusCode}");
      print("📥 Response Body: ${response.body}");

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print("📦 Parsed Data: $data");

        // Handle different possible response structures
        String? username;

        if (data is Map) {
          // Try different possible structures
          if (data.containsKey('user') && data['user'] is Map) {
            username = data['user']['username'] ?? data['user']['name'];
          } else if (data.containsKey('username')) {
            username = data['username'];
          } else if (data.containsKey('name')) {
            username = data['name'];
          } else if (data.containsKey('data') && data['data'] is Map) {
            username = data['data']['username'] ?? data['data']['name'];
          }
        }

        if (username != null) {
          print("✅ Login successful. Username: $username");
          return username;
        } else {
          print(
            "⚠️ Login response doesn't contain username in expected format",
          );
          print("⚠️ Full response structure: ${data.toString()}");
          // Return a default value or the email as fallback
          return email.split('@')[0]; // Use email prefix as username
        }
      } else {
        print("❌ Login failed: ${response.statusCode} - ${response.body}");
        return null;
      }
    } catch (e, stackTrace) {
      print("❌ Error logging in: $e");
      print("❌ Stack trace: $stackTrace");
      return null;
    }
  }

  static Future<bool> updatePassword(String email, String password) async {
    final url = Uri.parse('$baseUrl/forget-password');

    try {
      final response = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        print("✅ Password updated successfully!");
        return true;
      } else if (response.statusCode == 404) {
        print("❌ User not found. Cannot update password.");
        return false;
      } else {
        print("❌ Failed to update password: ${response.body}");
        return false;
      }
    } catch (e) {
      print("❌ Error updating password: $e");
      return false;
    }
  }

  static Future<bool> updateProfile(String name, String email) async {
    final response = await http.put(
      Uri.parse('$baseUrl/update-profile'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'username': name}),
    );
    return response.statusCode == 200;
  }

  static Future<bool> updatePasswordd(
    String currentPassword,
    String password,
  ) async {
    final box = GetStorage();
    String? currentEmail = box.read('email');

    final url = Uri.parse('$baseUrl/update-password');
    try {
      final response = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': currentEmail,
          'currentpassword': currentPassword,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        // print("✅ Password updated successfully!");
        return true;
      } else if (response.statusCode == 401) {
        // print("❌ Email already exists.");
        return false;
      } else if (response.statusCode == 404) {
        // print("❌ User not found.");
        return false;
      } else {
        // print("❌ Failed to update: ${response.body}");
        return false;
      }
    } catch (e) {
      // print("❌ Error: $e");
      return false;
    }
  }
  // // Real-time MongoDB data from Node.js backend
  // Future<void> fetchLiveData() async {
  //   try {
  //     final response = await GetConnect().get('http://10.0.2.2:8080/api/sensor/latest'); // Adjust URL
  //     if (response.statusCode == 200) {
  //       final data = response.body;
  //       accelNormal.value = data['normal'];
  //       accelSlouchy.value = data['slouchy'];
  //       acceloLeft.value = data['left'];
  //       acceloRight.value = data['right'];
  //       vibrationCount.value = data['vibrationCount'];
  //       airChamberCount.value = data['airChamberCount'];
  //       // optionally update progress bars
  //       progressValuefront.value = data['frontProgress'].toDouble();
  //       progressValueside.value = data['sideProgress'].toDouble();
  //       airChamberActive.value = data['airChamberActive'];
  //       vibrationActive.value = data['vibrationActive'];
  //     }
  //   } catch (e) {
  //     print("❌ Error fetching real-time data: $e");
  //   }
  // }
  //   import 'package:socket_io_client/socket_io_client.dart' as IO;

  // void setupSocketConnection() {
  //   IO.Socket socket = IO.io('http://10.0.2.2:8080', <String, dynamic>{
  //     'transports': ['websocket'],
  //     'autoConnect': true,
  //   });

  //   socket.onConnect((_) {
  //     print('Connected to socket server');
  //   });

  //   socket.on('sensorData', (data) {
  //     controller.accelNormal.value = data['normal'];
  //     controller.accelSlouchy.value = data['slouchy'];
  //     // update other data as needed
  //   });

  //   socket.onDisconnect((_) => print('Disconnected from socket server'));
  // }

  /// Fetch today's aggregated posture data from backend
  /// Returns: Map with keys: 'slouchyCount', 'leftCount', 'rightCount', 'total'
  /// Note: All users share the same data pool (not per-user)
  static Future<Map<String, int>> fetchTodayAggregatedData() async {
    final url = Uri.parse('$baseUrl/api/posture/today');
    try {
      print('📥 Fetching today\'s aggregated data from: $url');
      final response = await http.get(
        url,
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        print('✅ Today\'s data fetched: $responseData');

        // Extract counts from nested data object
        final data = responseData['data'] ?? {};
        int slouchyCount = data['i'] ?? 0; // i = slouchycount
        int leftCount = data['g'] ?? 0; // g = lsideCounter
        int rightCount = data['f'] ?? 0; // f = rsideCounter
        int totalCount = slouchyCount + leftCount + rightCount;

        return {
          'slouchyCount': slouchyCount,
          'leftCount': leftCount,
          'rightCount': rightCount,
          'total': totalCount,
        };
      } else {
        print('❌ Failed to fetch today\'s data: ${response.statusCode}');
        return {'slouchyCount': 0, 'leftCount': 0, 'rightCount': 0, 'total': 0};
      }
    } catch (e) {
      print('❌ Error fetching today\'s aggregated data: $e');
      return {'slouchyCount': 0, 'leftCount': 0, 'rightCount': 0, 'total': 0};
    }
  }

  /// Calculate percentage distribution for posture states
  /// Returns: Map with keys: 'slouchyPercent', 'leftPercent', 'rightPercent'
  static Map<String, double> calculatePercentages(
    Map<String, int> aggregatedData,
  ) {
    int total = aggregatedData['total'] ?? 1;
    if (total == 0) {
      return {'slouchyPercent': 0.0, 'leftPercent': 0.0, 'rightPercent': 0.0};
    }

    double slouchyPercent = (aggregatedData['slouchyCount']! / total) * 100;
    double leftPercent = (aggregatedData['leftCount']! / total) * 100;
    double rightPercent = (aggregatedData['rightCount']! / total) * 100;

    return {
      'slouchyPercent': double.parse(slouchyPercent.toStringAsFixed(2)),
      'leftPercent': double.parse(leftPercent.toStringAsFixed(2)),
      'rightPercent': double.parse(rightPercent.toStringAsFixed(2)),
    };
  }

  /// Fetch sensor history from backend with optional range/limit filters.
  /// Returns: List of sensor data maps
  static Future<List<Map<String, dynamic>>> fetchSensorHistory({
    int? days,
    int limit = 100,
  }) async {
    // Try multiple possible endpoints
    final endpoints = [
      '$baseUrl/sensorHistory',
      '$baseUrl/api/sensorHistory',
      '$baseUrl/api/sensor/history',
      '$baseUrl/api/sensor/sensorHistory',
    ];

    for (final endpoint in endpoints) {
      final queryParameters = <String, String>{'limit': limit.toString()};
      if (days != null && days > 0) {
        queryParameters['days'] = days.toString();
      }

      final url = Uri.parse(endpoint).replace(queryParameters: queryParameters);
      try {
        print('📥 Trying endpoint: $url');
        final response = await http.get(
          url,
          headers: {'Content-Type': 'application/json'},
        );

        print('📥 Response status: ${response.statusCode}');

        if (response.statusCode == 200) {
          final dynamic decodedData = jsonDecode(response.body);

          // Handle different response structures
          List<dynamic> data;
          if (decodedData is List) {
            data = decodedData;
          } else if (decodedData is Map && decodedData.containsKey('data')) {
            data = decodedData['data'] as List<dynamic>;
          } else if (decodedData is Map && decodedData.containsKey('history')) {
            data = decodedData['history'] as List<dynamic>;
          } else {
            print(
              '⚠️ Unexpected response structure: ${decodedData.runtimeType}',
            );
            continue; // Try next endpoint
          }

          print(
            '✅ Sensor history fetched from $endpoint: ${data.length} records',
          );
          if (data.isNotEmpty) {
            print('📊 Sample record keys: ${(data[0] as Map).keys.toList()}');
          }
          return data.cast<Map<String, dynamic>>();
        } else if (response.statusCode == 404) {
          print('⚠️ Endpoint not found (404): $endpoint');
          continue; // Try next endpoint
        } else {
          print('❌ Failed with status ${response.statusCode}: $endpoint');
          continue; // Try next endpoint
        }
      } catch (e) {
        print('❌ Error fetching from $endpoint: $e');
        continue; // Try next endpoint
      }
    }

    print('❌ All endpoints failed. No sensor history available.');
    return [];
  }

  /// Fetch aggregated posture counts for a specific date range.
  static Future<Map<String, dynamic>> fetchSensorHistorySummary({
    required int days,
  }) async {
    final endpoints = [
      '$baseUrl/sensorHistory/summary',
      '$baseUrl/api/sensorHistory/summary',
      '$baseUrl/api/sensor/history/summary',
      '$baseUrl/api/sensor/sensorHistory/summary',
    ];

    for (final endpoint in endpoints) {
      final url = Uri.parse(
        endpoint,
      ).replace(queryParameters: {'days': days.toString()});

      try {
        print('📥 Trying summary endpoint: $url');
        final response = await http.get(
          url,
          headers: {'Content-Type': 'application/json'},
        );

        if (response.statusCode == 200) {
          final dynamic decodedData = jsonDecode(response.body);
          if (decodedData is Map<String, dynamic>) {
            return decodedData;
          }
        } else if (response.statusCode == 404) {
          continue;
        }
      } catch (e) {
        print('❌ Error fetching summary from $endpoint: $e');
      }
    }

    return {'slouchy': 0, 'left': 0, 'right': 0, 'normal': 0, 'days': days};
  }
}
