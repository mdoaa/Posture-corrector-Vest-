import 'package:get/get.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class HomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => HomeController());
  }
}

class HomeController extends GetxController with GetTickerProviderStateMixin {
  // Sensor and activation states
  RxBool airChamberActive = false.obs;
  RxBool vibrationActive = false.obs;
  RxBool wifi = false.obs;
  RxInt sCount = 0.obs;
  RxInt rCount = 0.obs;
  RxInt lCount = 0.obs;
  RxInt callibration = (-1).obs;

  RxDouble slouchySeverity = 0.0.obs;
  RxDouble rightAndLeftSeverity = 0.0.obs;

  late IO.Socket socket;

  String toggleVibrationActive() =>
      vibrationActive.value ? "Active" : "Inactive";

  String toggleAirChamberActive() =>
      airChamberActive.value ? "Active" : "Inactive";

  @override
  void onInit() {
    super.onInit();
    initSocketConnection();
  }
  final start = DateTime.now();
  
    // /   socket = IO.io('http://172.20.10.2:8080', <String, dynamic>{
  //     'transports': ['websocket'],
  //     'autoConnect': true,
  //   });
  void initSocketConnection() {
  socket = IO.io('http://10.0.2.2:8080', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });;
    socket.onConnect((_) {
      print('🟢 Connected to WebSocket');
    });
    socket.on('sensorData', (data) {
      print('📥 Received data: $data');
      int slouchycount = data['i'] ?? 0;
      int lsideCounter = data['g'] ?? 0;
      int rsideCounter = data['f'] ?? 0;
      bool vib = data['c'] ?? false;
      bool chamber = data['b'] ?? false;
      int callibrationn = data['m'] ?? 0;
      int pitch = data['d'] ?? 0;
      int roll = data['e'] ?? 0;
      bool wifiConnection = data['w'] ?? false;
      vibrationActive.value = !vib;
      vibrationActive.value = vib;
      airChamberActive.value = !chamber;
      airChamberActive.value = chamber;
      slouchySeverity.value = pitch.toDouble();
      rightAndLeftSeverity.value = roll.toDouble();
      sCount.value = slouchycount;
      rCount.value = rsideCounter;
      lCount.value = lsideCounter;
      callibration.value = callibrationn;
      // wifi.value = !wifiConnection;
      wifi.value = wifiConnection;
    });
    socket.onDisconnect((_) {
      print('🔴 Disconnected from WebSocket');
    });
  }

  @override
  void onClose() {
    socket.close();
    super.onClose();
  }
}
