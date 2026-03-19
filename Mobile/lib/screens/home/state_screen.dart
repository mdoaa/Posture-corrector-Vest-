import 'package:fl_chart/fl_chart.dart';
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
                // Today's Summary Section
                Text(
                  "Today's Summary",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                _buildTodaySummaryGrid(controller),

                const SizedBox(height: 32),

                // Posture Time Counters Section
                Text(
                  "Posture Time Counters",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                _buildPostureCountersGrid(controller),

                const SizedBox(height: 32),

                // Monthly Posture Analytics Section
                Text(
                  "Monthly Posture Analytics",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                _buildDateRangeDropdown(controller),
                const SizedBox(height: 16),
                _buildMonthlyChart(controller, context),
                const SizedBox(height: 20),
              ],
            ),
          );
        }),
      ),
    );
  }

  // Build Today's Summary Grid (2x2)
  Widget _buildTodaySummaryGrid(StateScreenController controller) {
    return Obx(
      () => GridView.count(
        shrinkWrap: true,
        physics: NeverScrollableScrollPhysics(),
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.2,
        children: [
          _buildSummaryCard(
            "Slouchy",
            controller.slouchyPercent.value.toStringAsFixed(1) + "%",
            Colors.orange[700]!,
            Icons.arrow_downward,
          ),
          _buildSummaryCard(
            "Left",
            controller.leftPercent.value.toStringAsFixed(1) + "%",
            Colors.blue[600]!,
            Icons.arrow_back,
          ),
          _buildSummaryCard(
            "Right",
            controller.rightPercent.value.toStringAsFixed(1) + "%",
            Colors.purple[600]!,
            Icons.arrow_forward,
          ),
          _buildSummaryCard(
            "Normal",
            controller.normalPercent.value.toStringAsFixed(1) + "%",
            Colors.green[600]!,
            Icons.check_circle,
          ),
        ],
      ),
    );
  }

  // Build individual summary card
  Widget _buildSummaryCard(
    String title,
    String value,
    Color color,
    IconData icon,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 32, color: Colors.white),
          SizedBox(height: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  // Build Posture Time Counters Grid (2x2)
  Widget _buildPostureCountersGrid(StateScreenController controller) {
    return Obx(
      () => GridView.count(
        shrinkWrap: true,
        physics: NeverScrollableScrollPhysics(),
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.0,
        children: [
          _buildCounterCard(
            "Slouchy",
            controller.slouchyCount.value.toString(),
            Colors.orange[900]!,
            Icons.arrow_downward,
          ),
          _buildCounterCard(
            "Left",
            controller.leftCount.value.toString(),
            Colors.blue[900]!,
            Icons.arrow_back,
          ),
          _buildCounterCard(
            "Right",
            controller.rightCount.value.toString(),
            Colors.purple[900]!,
            Icons.arrow_forward,
          ),
          _buildCounterCard(
            "Normal",
            controller.normalCount.value.toString(),
            Colors.green[900]!,
            Icons.check_circle,
          ),
        ],
      ),
    );
  }

  // Build individual counter card
  Widget _buildCounterCard(
    String title,
    String count,
    Color color,
    IconData icon,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.5), width: 2),
      ),
      padding: EdgeInsets.all(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 24, color: Colors.white70),
          SizedBox(height: 6),
          Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          SizedBox(height: 2),
          Text(
            count,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          Text("count", style: TextStyle(fontSize: 11, color: Colors.white70)),
        ],
      ),
    );
  }

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
            items: [
              DropdownMenuItem(
                value: DateRange.last7,
                child: Text('Last 7 days'),
              ),
              DropdownMenuItem(
                value: DateRange.last14,
                child: Text('Last 14 days'),
              ),
              DropdownMenuItem(
                value: DateRange.last30,
                child: Text('Last 30 days'),
              ),
            ],
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

  // Build monthly analytics chart
  Widget _buildMonthlyChart(
    StateScreenController controller,
    BuildContext context,
  ) {
    return Obx(() {
      final total = controller.monthlyTotal;
      if (total == 0) {
        return Container(
          height: 300,
          padding: EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.grey[800],
            borderRadius: BorderRadius.circular(16),
          ),
          child: Center(
            child: Text(
              'No data available',
              style: TextStyle(color: Colors.white70, fontSize: 16),
            ),
          ),
        );
      }

      return Container(
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.grey[800],
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            SizedBox(
              height: 220,
              child: PieChart(
                PieChartData(
                  sectionsSpace: 2,
                  centerSpaceRadius: 60,
                  sections: [
                    PieChartSectionData(
                      value: controller.monthlyNormal.value.toDouble(),
                      color: Colors.green[600]!,
                      title:
                          '${controller.getMonthlyPercent(controller.monthlyNormal.value).toStringAsFixed(1)}%',
                      radius: 50,
                      titleStyle: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    PieChartSectionData(
                      value: controller.monthlySlouchy.value.toDouble(),
                      color: Colors.orange[700]!,
                      title:
                          '${controller.getMonthlyPercent(controller.monthlySlouchy.value).toStringAsFixed(1)}%',
                      radius: 50,
                      titleStyle: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    PieChartSectionData(
                      value: controller.monthlyLeft.value.toDouble(),
                      color: Colors.blue[600]!,
                      title:
                          '${controller.getMonthlyPercent(controller.monthlyLeft.value).toStringAsFixed(1)}%',
                      radius: 50,
                      titleStyle: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    PieChartSectionData(
                      value: controller.monthlyRight.value.toDouble(),
                      color: Colors.purple[600]!,
                      title:
                          '${controller.getMonthlyPercent(controller.monthlyRight.value).toStringAsFixed(1)}%',
                      radius: 50,
                      titleStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 16,
              runSpacing: 8,
              children: [
                _buildLegendItem(
                  Colors.green[600]!,
                  'Normal (${controller.monthlyNormal.value})',
                ),
                _buildLegendItem(
                  Colors.orange[700]!,
                  'Slouchy (${controller.monthlySlouchy.value})',
                ),
                _buildLegendItem(
                  Colors.blue[600]!,
                  'Left (${controller.monthlyLeft.value})',
                ),
                _buildLegendItem(
                  Colors.purple[600]!,
                  'Right (${controller.monthlyRight.value})',
                ),
              ],
            ),
          ],
        ),
      );
    });
  }

  // Build legend item
  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        SizedBox(width: 6),
        Text(label, style: TextStyle(color: Colors.white, fontSize: 13)),
      ],
    );
  }
}
