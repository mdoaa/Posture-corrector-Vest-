import 'package:get/get.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config.dart';
import '../Services/mongodb.dart';
import 'dart:async';

enum DateRange { last7, last14, last18, last28 }

class Sensors extends GetxController {
  late IO.Socket socket;
  Timer? _midnightResetTimer;
  Timer? _historyFetchTimer;

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

  RxDouble slouchyPercent = 0.0.obs;
  RxDouble rightPercent = 0.0.obs;
  RxDouble leftPercent = 0.0.obs;

  // Today's aggregated data
  RxInt todaySlouchyCount = 0.obs;
  RxInt todayLeftCount = 0.obs;
  RxInt todayRightCount = 0.obs;
  RxInt todayTotalCount = 0.obs;

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
    socket = IO.io(
      AppConfig.webSocketUrl,
      Map<String, dynamic>.from(AppConfig.socketIOOptions),
    );

    socket.onConnect((_) {
      print('🟢 Connected to WebSocket');
    });

    socket.on('sensorHistoryData', (data) {
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

      slouchyPercent.value = slouchypercent.toDouble();
      rightPercent.value = rightpercent.toDouble();
      leftPercent.value = leftpercent.toDouble();

      // Update today's summary on every data receive
      _fetchTodayData();
    });

    socket.onDisconnect((_) {
      print('🔴 Disconnected from WebSocket');
    });

    // Setup midnight reset
    _setupMidnightReset();

    // Fetch today's aggregated data on connection
    _fetchTodayData();

    // Start periodic sensor history fetching for analytics
    _startHistoryFetching();
  }

  /// Start periodic fetching of sensor history for weekly/monthly analytics
  void _startHistoryFetching() {
    // Fetch immediately on start
    _fetchAndProcessHistory();

    // Then fetch every 30 seconds for real-time updates
    _historyFetchTimer = Timer.periodic(Duration(seconds: 30), (_) {
      _fetchAndProcessHistory();
    });

    print('⏰ Started periodic history fetching (every 30s)');
  }

  /// Fetch sensor history and update analytics
  Future<void> _fetchAndProcessHistory() async {
    try {
      final history = await Mongodb.fetchSensorHistory();

      if (history.isEmpty) {
        print('⚠️ No history data available');
        return;
      }

      // Process the latest record for current stats
      final latest = history.first;
      _updateWithLatestData(latest);

      // Calculate weekly data
      _calculateWeeklyData(history);

      // Calculate monthly data for all ranges
      _calculateMonthlyData(history);

      print('✅ History data processed and UI updated');
    } catch (e) {
      print('❌ Error processing history: $e');
    }
  }

  /// Update current statistics with latest record
  void _updateWithLatestData(Map<String, dynamic> data) {
    totalIncorrect.value =
        (data['i'] ?? 0) + (data['g'] ?? 0) + (data['f'] ?? 0);
    totalcount.value = data['j'] ?? 0;
    totaltime.value = data['l'] ?? 0;
    normalcount.value = data['h'] ?? 0;
    sCount.value = data['i'] ?? 0;
    rCount.value = data['f'] ?? 0;
    lCount.value = data['g'] ?? 0;

    pnormal.value = data['n'] ?? 0;
    pmild.value = data['o'] ?? 0;
    pmoderate.value = data['k'] ?? 0;
    psevere.value = data['p'] ?? 0;

    rNormal.value = data['q'] ?? 0;
    rModerate.value = data['r'] ?? 0;
    rSevere.value = data['s'] ?? 0;

    lNormal.value = data['t'] ?? 0;
    lModerate.value = data['u'] ?? 0;
    lSevere.value = data['v'] ?? 0;

    slouchyPercent.value = (data['zzz'] ?? 0).toDouble();
    rightPercent.value = (data['z'] ?? 0).toDouble();
    leftPercent.value = (data['zz'] ?? 0).toDouble();
  }

  /// Calculate weekly posture data from history
  void _calculateWeeklyData(List<Map<String, dynamic>> history) {
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));

    // Initialize weekly data for 7 days
    final weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final Map<int, Map<String, int>> dayData = {};

    for (int i = 0; i < 7; i++) {
      dayData[i] = {'slouchy': 0, 'leftRight': 0, 'airChambers': 0};
    }

    // Process history records
    for (var record in history) {
      final receivedAt = record['receivedAt'];
      if (receivedAt == null) continue;

      DateTime recordDate;
      if (receivedAt is String) {
        recordDate = DateTime.parse(receivedAt);
      } else if (receivedAt is int) {
        recordDate = DateTime.fromMillisecondsSinceEpoch(receivedAt);
      } else {
        continue;
      }

      // Check if record is within this week
      final daysDiff = recordDate.difference(startOfWeek).inDays;
      if (daysDiff >= 0 && daysDiff < 7) {
        final slouchy = (record['i'] ?? 0) as int;
        final left = (record['g'] ?? 0) as int;
        final right = (record['f'] ?? 0) as int;
        final pump = (record['j'] ?? 0) as int;

        dayData[daysDiff]!['slouchy'] =
            dayData[daysDiff]!['slouchy']! + slouchy;
        dayData[daysDiff]!['leftRight'] =
            dayData[daysDiff]!['leftRight']! + left + right;
        dayData[daysDiff]!['airChambers'] =
            dayData[daysDiff]!['airChambers']! + pump;
      }
    }

    // Update weeklyData observable
    weeklyData.value = List.generate(7, (index) {
      return WeeklyPostureData(
        day: weekDays[index],
        slouchy: dayData[index]!['slouchy']!,
        leftRight: dayData[index]!['leftRight']!,
        airChambers: dayData[index]!['airChambers']!,
      );
    });
  }

  /// Calculate monthly posture data for different date ranges
  void _calculateMonthlyData(List<Map<String, dynamic>> history) {
    final now = DateTime.now();

    // Calculate for each date range
    for (var range in DateRange.values) {
      int days;
      switch (range) {
        case DateRange.last7:
          days = 7;
          break;
        case DateRange.last14:
          days = 14;
          break;
        case DateRange.last18:
          days = 18;
          break;
        case DateRange.last28:
          days = 28;
          break;
      }

      final cutoffDate = now.subtract(Duration(days: days));
      int normalCount = 0;
      int slouchyCount = 0;
      int leftCount = 0;
      int rightCount = 0;
      int airChambersCount = 0;

      // Process records within date range
      for (var record in history) {
        final receivedAt = record['receivedAt'];
        if (receivedAt == null) continue;

        DateTime recordDate;
        if (receivedAt is String) {
          recordDate = DateTime.parse(receivedAt);
        } else if (receivedAt is int) {
          recordDate = DateTime.fromMillisecondsSinceEpoch(receivedAt);
        } else {
          continue;
        }

        if (recordDate.isAfter(cutoffDate)) {
          normalCount += (record['h'] ?? 0) as int;
          slouchyCount += (record['i'] ?? 0) as int;
          leftCount += (record['g'] ?? 0) as int;
          rightCount += (record['f'] ?? 0) as int;
          airChambersCount += (record['j'] ?? 0) as int;
        }
      }

      // Update rangeData
      rangeData[range] = MonthlyPostureData(
        normal: normalCount,
        slouchy: slouchyCount,
        left: leftCount,
        right: rightCount,
        airChambers: airChambersCount,
      );
    }
  }

  /// Fetch and update today's aggregated posture data
  /// Note: All users share the same data pool
  Future<void> _fetchTodayData() async {
    try {
      final aggregatedData = await Mongodb.fetchTodayAggregatedData();

      // Update today's counts
      todaySlouchyCount.value = aggregatedData['slouchyCount'] ?? 0;
      todayLeftCount.value = aggregatedData['leftCount'] ?? 0;
      todayRightCount.value = aggregatedData['rightCount'] ?? 0;
      todayTotalCount.value = aggregatedData['total'] ?? 0;

      // Calculate and update percentages
      final percentages = Mongodb.calculatePercentages(aggregatedData);
      slouchyPercent.value = percentages['slouchyPercent'] ?? 0.0;
      leftPercent.value = percentages['leftPercent'] ?? 0.0;
      rightPercent.value = percentages['rightPercent'] ?? 0.0;

      print('✅ Today\'s data updated:');
      print(
        '   Slouchy: ${todaySlouchyCount.value} (${slouchyPercent.value}%)',
      );
      print('   Left: ${todayLeftCount.value} (${leftPercent.value}%)');
      print('   Right: ${todayRightCount.value} (${rightPercent.value}%)');
    } catch (e) {
      print('❌ Error fetching today\'s data: $e');
    }
  }

  /// Setup automatic reset at midnight (00:00)
  void _setupMidnightReset() {
    _midnightResetTimer?.cancel();

    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    final durationUntilMidnight = tomorrow.difference(now);

    print(
      '⏰ Next reset scheduled in ${durationUntilMidnight.inHours}h ${durationUntilMidnight.inMinutes % 60}m',
    );

    _midnightResetTimer = Timer(durationUntilMidnight, () {
      print('🔄 Midnight reached - Resetting today\'s counters');
      _resetTodayCounters();
      _setupMidnightReset(); // Setup next reset
    });
  }

  /// Reset counters for the new day
  void _resetTodayCounters() {
    todaySlouchyCount.value = 0;
    todayLeftCount.value = 0;
    todayRightCount.value = 0;
    todayTotalCount.value = 0;
    slouchyPercent.value = 0.0;
    leftPercent.value = 0.0;
    rightPercent.value = 0.0;

    print('✅ Counters reset for new day');

    // Fetch data for the new day
    _fetchTodayData();
  }

  @override
  void onClose() {
    _midnightResetTimer?.cancel();
    _historyFetchTimer?.cancel();
    socket.disconnect();
    super.onClose();
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
