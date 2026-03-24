import 'package:get/get.dart';

import '../../Services/mongodb.dart';

enum DateRange { today, week, twoWeeks, month, sixMonths, year }

class StateScreenController extends GetxController {
  Rx<DateRange> selectedRange = DateRange.today.obs;
  RxBool isLoading = true.obs;

  // Summary cards (top of page)
  RxInt todayNormalCount = 0.obs;
  RxInt todaySlouchyCount = 0.obs;
  RxInt todayVibrationOpenedCount = 0.obs;
  RxInt todayAirChamberOpenedCount = 0.obs;
  RxDouble todayVibrationMinutes = 0.0.obs;
  RxDouble todayAirChamberMinutes = 0.0.obs;

  RxDouble todayNormalPercent = 0.0.obs;
  RxDouble todaySlouchyPercent = 0.0.obs;

  // Pie chart section (same selected range)
  RxInt monthlyNormal = 0.obs;
  RxInt monthlySlouchy = 0.obs;
  RxInt monthlyVibration = 0.obs;

  final Map<DateRange, Map<String, int>> _rangeMetrics = {};

  @override
  void onInit() {
    super.onInit();
    fetchAllRanges();
  }

  Future<void> fetchAllRanges() async {
    try {
      final aggregated = await Mongodb.fetchAggregatedMetrics();

      _rangeMetrics[DateRange.today] =
          aggregated['today'] ?? _emptyWindowMetrics();
      _rangeMetrics[DateRange.week] =
          aggregated['week'] ?? _emptyWindowMetrics();
      _rangeMetrics[DateRange.twoWeeks] =
          aggregated['twoWeeks'] ?? _emptyWindowMetrics();
      _rangeMetrics[DateRange.month] =
          aggregated['month'] ?? _emptyWindowMetrics();
      _rangeMetrics[DateRange.sixMonths] =
          aggregated['sixMonths'] ?? _emptyWindowMetrics();
      _rangeMetrics[DateRange.year] =
          aggregated['year'] ?? _emptyWindowMetrics();

      _applySelectedRange();
    } catch (e) {
      print('❌ Error fetching aggregated ranges: $e');
    } finally {
      isLoading.value = false;
    }
  }

  void changeRange(DateRange newRange) {
    selectedRange.value = newRange;
    _applySelectedRange();
  }

  String getRangeLabel(DateRange range) {
    switch (range) {
      case DateRange.today:
        return 'Today';
      case DateRange.week:
        return 'Last 7 days';
      case DateRange.twoWeeks:
        return 'Last 14 days';
      case DateRange.month:
        return 'Last 30 days';
      case DateRange.sixMonths:
        return 'Last 6 months';
      case DateRange.year:
        return 'Last 12 months';
    }
  }

  List<DateRange> get allRanges => DateRange.values;

  int get monthlyTotal =>
      monthlyNormal.value + monthlySlouchy.value + monthlyVibration.value;

  double getMonthlyPercent(int count) {
    if (monthlyTotal == 0) return 0.0;
    return (count / monthlyTotal) * 100;
  }

  void _applySelectedRange() {
    final values = _rangeMetrics[selectedRange.value] ?? _emptyWindowMetrics();

    final normal = _toInt(values['normalCount']);
    final slouchy = _toInt(values['slouchyCount']);
    final vibrationSec = _toInt(values['vibrationActiveDurationSec']);
    final airChamberSec = _toInt(values['airChamberActiveDurationSec']);

    // Top cards
    todayNormalCount.value = normal;
    todaySlouchyCount.value = slouchy;
    todayVibrationOpenedCount.value = vibrationSec;
    todayAirChamberOpenedCount.value = airChamberSec;
    todayVibrationMinutes.value = vibrationSec / 60.0;
    todayAirChamberMinutes.value = airChamberSec / 60.0;

    // Pie chart (same chosen range)
    monthlyNormal.value = normal;
    monthlySlouchy.value = slouchy;
    monthlyVibration.value = vibrationSec;

    final total = normal + slouchy;
    if (total <= 0) {
      todayNormalPercent.value = 0;
      todaySlouchyPercent.value = 0;
      return;
    }

    todayNormalPercent.value = (normal / total) * 100;
    todaySlouchyPercent.value = (slouchy / total) * 100;
  }

  Map<String, int> _emptyWindowMetrics() {
    return {
      'normalCount': 0,
      'slouchyCount': 0,
      'vibrationActiveDurationSec': 0,
      'airChamberActiveDurationSec': 0,
    };
  }

  int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is double) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
