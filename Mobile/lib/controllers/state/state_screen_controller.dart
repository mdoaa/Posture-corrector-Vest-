import 'package:get/get.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../../Services/mongodb.dart';
import '../../config.dart';
import 'dart:async';

enum DateRange { last7, last14, last30 }

class StateScreenController extends GetxController {
  late IO.Socket socket;

  // Today's Summary Data
  RxInt slouchyCount = 0.obs;
  RxInt leftCount = 0.obs;
  RxInt rightCount = 0.obs;
  RxInt normalCount = 0.obs;

  RxDouble slouchyPercent = 0.0.obs;
  RxDouble leftPercent = 0.0.obs;
  RxDouble rightPercent = 0.0.obs;
  RxDouble normalPercent = 0.0.obs;

  // Monthly Analytics Data
  Rx<DateRange> selectedRange = DateRange.last7.obs;
  RxInt monthlyNormal = 0.obs;
  RxInt monthlySlouchy = 0.obs;
  RxInt monthlyLeft = 0.obs;
  RxInt monthlyRight = 0.obs;

  RxBool isLoading = true.obs;
  Timer? _refreshTimer;

  @override
  void onInit() {
    super.onInit();
    initSocketConnection();
    fetchSensorData();
    // Refresh data every 10 seconds as backup
    _refreshTimer = Timer.periodic(Duration(seconds: 10), (_) {
      fetchSensorData();
    });
  }

  @override
  void onClose() {
    _refreshTimer?.cancel();
    socket.dispose();
    super.onClose();
  }

  /// Initialize WebSocket connection for real-time updates
  void initSocketConnection() {
    socket = IO.io(
      AppConfig.webSocketUrl,
      Map<String, dynamic>.from(AppConfig.socketIOOptions),
    );

    socket.onConnect((_) {
      print('🟢 State Screen: Connected to WebSocket');
    });

    socket.on('sensorHistoryData', (data) {
      print('📥 State Screen: Received real-time data');
      _processRealtimeData(data);
    });

    socket.onDisconnect((_) {
      print('🔴 State Screen: Disconnected from WebSocket');
    });
  }

  /// Process real-time data from WebSocket
  void _processRealtimeData(dynamic data) {
    try {
      // Update today's summary with real-time cumulative data
      slouchyCount.value = data['i'] ?? slouchyCount.value;
      leftCount.value = data['g'] ?? leftCount.value;
      rightCount.value = data['f'] ?? rightCount.value;
      normalCount.value = data['h'] ?? normalCount.value;

      // Recalculate percentages
      _calculatePercentages();

      print(
        '✅ Updated counts - Slouchy: ${slouchyCount.value}, Left: ${leftCount.value}, Right: ${rightCount.value}, Normal: ${normalCount.value}',
      );
    } catch (e) {
      print('❌ Error processing real-time data: $e');
    }
  }

  /// Fetch sensor history and process it
  Future<void> fetchSensorData() async {
    try {
      print('📥 Fetching sensor history...');

      // Fetch latest record only (today summary comes from latest cumulative values)
      final List<Map<String, dynamic>> sensorHistory =
          await Mongodb.fetchSensorHistory(limit: 1);

      if (sensorHistory.isEmpty) {
        print('⚠️ No sensor history data available');
        isLoading.value = false;
        return;
      }

      print('✅ Fetched ${sensorHistory.length} records');

      // Process latest counters + range summary
      _processSensorHistory(sensorHistory);
      await _refreshMonthlySummary();

      isLoading.value = false;
    } catch (e) {
      print('❌ Error fetching sensor data: $e');
      isLoading.value = false;
    }
  }

  /// Process sensor history for today's summary and monthly analytics
  void _processSensorHistory(List<Map<String, dynamic>> history) {
    if (history.isEmpty) return;

    // The API returns records in descending order (latest first)
    // So the first record is the most recent one with cumulative counts
    var latestRecord = history.first;

    print('📊 Processing latest record:');
    print('  - Slouchy (i): ${latestRecord['i']}');
    print('  - Left (g): ${latestRecord['g']}');
    print('  - Right (f): ${latestRecord['f']}');
    print('  - Normal (h): ${latestRecord['h']}');
    print('  - ReceivedAt: ${latestRecord['receivedAt']}');

    // Update today's summary counts
    slouchyCount.value = latestRecord['i'] ?? 0;
    leftCount.value = latestRecord['g'] ?? 0;
    rightCount.value = latestRecord['f'] ?? 0;
    normalCount.value = latestRecord['h'] ?? 0;

    // Calculate percentages for today's summary
    _calculatePercentages();

    print('✅ Updated Today\'s Summary:');
    print(
      '  - Slouchy: ${slouchyCount.value} (${slouchyPercent.value.toStringAsFixed(1)}%)',
    );
    print(
      '  - Left: ${leftCount.value} (${leftPercent.value.toStringAsFixed(1)}%)',
    );
    print(
      '  - Right: ${rightCount.value} (${rightPercent.value.toStringAsFixed(1)}%)',
    );
    print(
      '  - Normal: ${normalCount.value} (${normalPercent.value.toStringAsFixed(1)}%)',
    );
  }

  /// Refresh monthly chart data using backend range summary.
  Future<void> _refreshMonthlySummary() async {
    try {
      final days = _getDaysForRange(selectedRange.value);
      final summary = await Mongodb.fetchSensorHistorySummary(days: days);

      monthlySlouchy.value = summary['slouchy'] ?? 0;
      monthlyLeft.value = summary['left'] ?? 0;
      monthlyRight.value = summary['right'] ?? 0;
      monthlyNormal.value = summary['normal'] ?? 0;

      print('✅ Updated Monthly Data (${_getRangeLabel(selectedRange.value)}):');
      print('  - Slouchy: ${monthlySlouchy.value}');
      print('  - Left: ${monthlyLeft.value}');
      print('  - Right: ${monthlyRight.value}');
      print('  - Normal: ${monthlyNormal.value}');
    } catch (e) {
      print('❌ Error refreshing monthly summary: $e');
    }
  }

  String _getRangeLabel(DateRange range) {
    switch (range) {
      case DateRange.last7:
        return 'Last 7 days';
      case DateRange.last14:
        return 'Last 14 days';
      case DateRange.last30:
        return 'Last 30 days';
    }
  }

  /// Calculate percentage distribution for today's summary
  void _calculatePercentages() {
    int total =
        slouchyCount.value +
        leftCount.value +
        rightCount.value +
        normalCount.value;

    if (total == 0) {
      slouchyPercent.value = 0.0;
      leftPercent.value = 0.0;
      rightPercent.value = 0.0;
      normalPercent.value = 0.0;
      return;
    }

    slouchyPercent.value = (slouchyCount.value / total) * 100;
    leftPercent.value = (leftCount.value / total) * 100;
    rightPercent.value = (rightCount.value / total) * 100;
    normalPercent.value = (normalCount.value / total) * 100;
  }

  /// Get days to subtract based on selected range
  int _getDaysForRange(DateRange range) {
    switch (range) {
      case DateRange.last7:
        return 7;
      case DateRange.last14:
        return 14;
      case DateRange.last30:
        return 30;
    }
  }

  /// Change date range and refresh data
  void changeRange(DateRange newRange) {
    selectedRange.value = newRange;
    _refreshMonthlySummary();
  }

  /// Get total count for monthly analytics
  int get monthlyTotal =>
      monthlyNormal.value +
      monthlySlouchy.value +
      monthlyLeft.value +
      monthlyRight.value;

  /// Get monthly percentage for each posture type
  double getMonthlyPercent(int count) {
    if (monthlyTotal == 0) return 0.0;
    return (count / monthlyTotal) * 100;
  }
}
