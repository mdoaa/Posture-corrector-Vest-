import 'package:get/get.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

enum DateRange { last7, last14, last18, last28 }

class Sensors extends GetxController {
  late IO.Socket socket;

  RxInt sCount = 5.obs;
  RxInt rCount = 0.obs;
  RxInt lCount = 0.obs;
  RxInt normalcount = 0.obs;

  RxInt totalIncorrect = 0.obs;
  RxInt totalcount = 0.obs;
  RxInt totaltime = 0.obs;

  RxInt pnormal = 0.obs;
  RxInt pmild = 0.obs;
  RxInt pmoderate = 0.obs;
  RxInt psevere = 0.obs;

  RxInt rNormal = 0.obs;
  RxInt rModerate = 0.obs;
  RxInt rSevere = 0.obs;

  RxInt lNormal = 0.obs;
  RxInt lModerate = 0.obs;
  RxInt lSevere = 0.obs;

  RxInt slouchyPercent = 0.obs;
  RxInt rightPercent = 0.obs;
  RxInt leftPercent = 0.obs;

  Rx<DateRange> selectedRange = DateRange.last7.obs;
  Map<DateRange, MonthlyPostureData> rangeData = {
    DateRange.last7: MonthlyPostureData(
      normal: 40,
      slouchy: 20,
      left: 15,
      right: 5,
      airChambers: 25,
    ),
    DateRange.last14: MonthlyPostureData(
      normal: 80,
      slouchy: 35,
      left: 20,
      right: 10,
      airChambers: 50,
    ),
    DateRange.last18: MonthlyPostureData(
      normal: 100,
      slouchy: 45,
      left: 28,
      right: 14,
      airChambers: 60,
    ),
    DateRange.last28: MonthlyPostureData(
      normal: 120,
      slouchy: 55,
      left: 32,
      right: 18,
      airChambers: 75,
    ),
  };
  MonthlyPostureData get currentData => rangeData[selectedRange.value]!;
  var weeklyData =
      <WeeklyPostureData>[
        WeeklyPostureData(
          day: 'Mon',
          slouchy: 12,
          leftRight: 8,
          airChambers: 15,
        ),
        WeeklyPostureData(
          day: 'Tue',
          slouchy: 8,
          leftRight: 5,
          airChambers: 10,
        ),
        WeeklyPostureData(
          day: 'Wed',
          slouchy: 15,
          leftRight: 10,
          airChambers: 20,
        ),
        WeeklyPostureData(day: 'Thu', slouchy: 6, leftRight: 3, airChambers: 8),
        WeeklyPostureData(
          day: 'Fri',
          slouchy: 10,
          leftRight: 7,
          airChambers: 12,
        ),
        WeeklyPostureData(day: 'Sat', slouchy: 5, leftRight: 2, airChambers: 5),
        WeeklyPostureData(day: 'Sun', slouchy: 7, leftRight: 4, airChambers: 9),
      ].obs;

  void initSocketConnection() {
    socket = IO.io('http://10.0.2.2:8080', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    socket.onConnect((_) {
      print('🟢 Connected to WebSocket');
    });

    socket.on('sensorHistory', (data) {
      print('📥 Received data: $data');
      int slouchycount = data['i'] ?? 0;
      int lsideCounter = data['g'] ?? 0;
      int rsideCounter = data['f'] ?? 0;
      int normal = data['h'] ?? 0;

      int totalcounts = data['j'] ?? 0;
      int totalmin = data['l'] ?? 0;

      int snormal = data['n'] ?? 0;
      int smild = data['o'] ?? 0;
      int smoderate = data['k'] ?? 0;
      int sSevere = data['p'] ?? 0;

      int rnormal = data['q'] ?? 0;
      int rmoderate = data['r'] ?? 0;
      int rsevere = data['s'] ?? 0;

      int lnormal = data['t'] ?? 0;
      int lmoderate = data['u'] ?? 0;
      int lsevere = data['v'] ?? 0;

      int slouchypercent = data['zzz'] ?? 0;
      int rightpercent = data['z'] ?? 0;
      int leftpercent = data['zz'] ?? 0;

      totalIncorrect.value = slouchycount + lsideCounter + rsideCounter;
      // total.value = slouchycount + lsideCounter + rsideCounter + normal;
      totalcount.value = totalcounts;
      totaltime.value = totalmin;
      normalcount.value = normal;
      sCount.value = slouchycount;
      rCount.value = rsideCounter;
      lCount.value = lsideCounter;

      pnormal.value = snormal;
      pmild.value = smild;
      pmoderate.value = smoderate;
      psevere.value = sSevere;

      rNormal.value = rnormal;
      rModerate.value = rmoderate;
      rSevere.value = rsevere;

      lNormal.value = lnormal;
      lModerate.value = lmoderate;
      lSevere.value = lsevere;

      slouchyPercent.value = slouchypercent;
      rightPercent.value = rightpercent;
      leftPercent.value = leftpercent;
    });

    socket.onDisconnect((_) {
      print('🔴 Disconnected from WebSocket');
    });
  }
}

class WeeklyPostureData {
  final String day;
  final int slouchy;
  final int leftRight;
  final int airChambers;

  WeeklyPostureData({
    required this.day,
    required this.slouchy,
    required this.leftRight,
    required this.airChambers,
  });
}

class MonthlyPostureData {
  final int normal;
  final int slouchy;
  final int left;
  final int right;
  final int airChambers;

  MonthlyPostureData({
    required this.normal,
    required this.slouchy,
    required this.left,
    required this.right,
    required this.airChambers,
  });

  int get total => normal + slouchy + left + right + airChambers;
}
