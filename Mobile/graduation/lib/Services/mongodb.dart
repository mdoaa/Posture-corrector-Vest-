import 'dart:convert';
import 'package:get_storage/get_storage.dart';
import 'package:http/http.dart' as http;
// import 'package:socket_io_client/socket_io_client.dart' as io;

class Mongodb {
  String name;
  String email;
  String password;

  static const String baseUrl = 'http://172.20.10.2:8080';

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
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final username = data['user']['username'];

        print("✅ Login successful. Username: $username");
        return username; // Return the username
      } else {
        print("❌ Login failed: ${response.statusCode} - ${response.body}");
        return null;
      }
    } catch (e) {
      print("❌ Error logging in: $e");
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
}
