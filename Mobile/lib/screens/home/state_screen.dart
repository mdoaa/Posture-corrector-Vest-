import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/state/state_screen_controller.dart';

class StateScreenPage extends StatelessWidget {
  const StateScreenPage({super.key});

  @override
  Widget build(BuildContext context) {
    final StateScreenController controller = Get.put(StateScreenController());

    return Scaffold(
      backgroundColor: Colors.grey[850],
      body: SafeArea(
        child: Obx(() {
          if (controller.isLoading.value) {
            return Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: 20.0,
              vertical: 16.0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDateRangeDropdown(controller),
                const SizedBox(height: 18),

                // Today's Summary Section
                Text(
                  "Summary",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                _buildTodaySummaryGrid(controller),

                const SizedBox(height: 32),
              ],
            ),
          );
        }),
      ),
    );
  }

  // Build Today's Summary Grid (2x2)
  Widget _buildTodaySummaryGrid(StateScreenController controller) {
    return Obx(() {
      return GridView.count(
        shrinkWrap: true,
        physics: NeverScrollableScrollPhysics(),
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.15,
        children: [
          _buildTodayApiCard(
            "Normal",
            controller.todayNormalPercent.value.toStringAsFixed(1) + "%",
            controller.todayNormalCount.value,
            Colors.green[600]!,
            Icons.check_circle,
          ),
          _buildTodayApiCard(
            "Slouchy",
            controller.todaySlouchyPercent.value.toStringAsFixed(1) + "%",
            controller.todaySlouchyCount.value,
            Colors.orange[700]!,
            Icons.arrow_downward,
          ),
          _buildTodayApiCard(
            "Vibration",
            '${controller.todayVibrationMinutes.value.toStringAsFixed(1)} min',
            controller.todayVibrationOpenedCount.value,
            Colors.teal[600]!,
            Icons.vibration,
            showCountLabel: false,
          ),
          _buildTodayApiCard(
            "Air Chamber",
            '${controller.todayAirChamberMinutes.value.toStringAsFixed(1)} min',
            controller.todayAirChamberOpenedCount.value,
            Colors.indigo[600]!,
            Icons.air,
            showCountLabel: false,
          ),
        ],
      );
    });
  }

  Widget _buildTodayApiCard(
    String title,
    String value,
    int count,
    Color color,
    IconData icon,
    {bool showCountLabel = true}
  ) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(14),
      ),
      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 14),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 24, color: Colors.white),
          SizedBox(height: 6),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          SizedBox(height: 2),
          if (showCountLabel)
            Text(
              'count: $count',
              style: TextStyle(fontSize: 11, color: Colors.white70),
            ),
        ],
      ),
    );
  }

  // Build individual summary card
  // Build date range dropdown
  Widget _buildDateRangeDropdown(StateScreenController controller) {
    return Obx(
      () => Center(
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.grey[700],
            borderRadius: BorderRadius.circular(8),
          ),
          child: DropdownButton<DateRange>(
            value: controller.selectedRange.value,
            dropdownColor: Colors.grey[700],
            underline: SizedBox(),
            style: TextStyle(color: Colors.white, fontSize: 16),
            items: controller.allRanges
                .map(
                  (range) => DropdownMenuItem(
                    value: range,
                    child: Text(controller.getRangeLabel(range)),
                  ),
                )
                .toList(),
            onChanged: (value) {
              if (value != null) {
                controller.changeRange(value);
              }
            },
          ),
        ),
      ),
    );
  }

}
