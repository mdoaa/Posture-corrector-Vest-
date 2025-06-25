import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/sensors_controller.dart';
import 'dart:math' as math;

class StateScreenPage extends GetView<Sensors> {
  const StateScreenPage({super.key});

  @override
  Widget build(BuildContext context) {
    final weekDays = controller.weeklyData.map((e) => e.day).toList();
    final Color theme =
        Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black;
    // final data = controller;
    // final total = data.total.toDouble();
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
          child: Column(
            children: [
              Align(
                alignment: Alignment.center,
                child: Text(
                  "Overall insights",
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: theme,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 3,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 220,
                        child: Obx(
                          () => PieChart(
                            PieChartData(
                              sectionsSpace: 1,
                              centerSpaceRadius: 30,
                              sections: [
                                PieChartSectionData(
                                  value: controller.normalcount.toDouble(),
                                  color: Colors.green,
                                  title:
                                      controller.totalcount.value > 0
                                          ? '${((controller.normalcount.value / controller.totalcount.value) * 100).toStringAsFixed(1)}%'
                                          : '0%',
                                  radius: 50,
                                  titleStyle: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: theme,
                                  ),
                                ),
                                PieChartSectionData(
                                  value: controller.totalIncorrect.toDouble(),
                                  color: Colors.red,
                                  title:
                                      controller.totalcount.value > 0
                                          ? '${((controller.totalIncorrect.value / controller.totalcount.value) * 100).toStringAsFixed(1)}%'
                                          : '0%',
                                  radius: 50,
                                  titleStyle: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: theme,
                                  ),
                                ),
                              ],
                              pieTouchData: PieTouchData(
                                touchCallback:
                                    (FlTouchEvent event, pieTouchResponse) {},
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        alignment: WrapAlignment.center,
                        spacing: 12,
                        runSpacing: 8,
                        children: [
                          Obx(
                            () => _pieChartInfo(
                              Colors.green,
                              'Normal posture(${controller.normalcount.value})',
                              theme,
                            ),
                          ),
                          Obx(
                            () => _pieChartInfo(
                              Colors.red,
                              'Incorrect posture (${controller.totalIncorrect.value})',
                              theme,
                            ),
                          ),
                          Obx(
                            () => Text(
                              "Total used time : ${controller.totaltime.value}m",
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const SizedBox(height: 24),
              Text(
                "Posture Severity Levels",
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: theme,
                ),
              ),
              const SizedBox(height: 12),

              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                elevation: 3,
                margin: const EdgeInsets.symmetric(horizontal: 14),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Posture Severity Chart",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: theme,
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        height: 300,
                        child: BarChart(
                          BarChartData(
                            alignment: BarChartAlignment.spaceAround,
                            barGroups: [
                              makeSeverityGroup(
                                0,
                                [
                                  controller.pnormal.value.toDouble(),
                                  controller.pmild.value.toDouble(),
                                  controller.pmoderate.value.toDouble(),
                                  controller.psevere.value.toDouble(),
                                ],
                                // [100, 20, 10, 10],
                                [
                                  Colors.green,
                                  Colors.yellow,
                                  Colors.orange,
                                  Colors.red,
                                ],
                              ), // Slouchy

                              makeSeverityGroup(
                                1,
                                [
                                  controller.rNormal.value.toDouble(),
                                  controller.rModerate.value.toDouble(),
                                  controller.rSevere.value.toDouble(),
                                ],
                                // [80, 25, 20],
                                [Colors.green, Colors.orange, Colors.red],
                              ), // Right

                              makeSeverityGroup(
                                2,
                                [
                                  controller.lNormal.value.toDouble(),
                                  controller.lModerate.value.toDouble(),
                                  controller.lSevere.value.toDouble(),
                                ],
                                [Colors.green, Colors.orange, Colors.red],
                              ), // Left
                            ],
                            titlesData: FlTitlesData(
                              leftTitles: AxisTitles(
                                sideTitles: SideTitles(showTitles: true),
                              ),
                              bottomTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  getTitlesWidget: (value, meta) {
                                    switch (value.toInt()) {
                                      case 0:
                                        return Text("Slouchy");
                                      case 1:
                                        return Text("Right");
                                      case 2:
                                        return Text("Left");
                                      default:
                                        return const Text('');
                                    }
                                  },
                                ),
                              ),
                            ),
                            gridData: FlGridData(show: true),
                            borderData: FlBorderData(show: false),
                            maxY: 200,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 12,
                        runSpacing: 8,
                        children: [
                          _pieChartInfo(Colors.green, 'Normal', theme),
                          _pieChartInfo(Colors.yellow, 'Mild', theme),
                          _pieChartInfo(Colors.orange, 'Moderate', theme),
                          _pieChartInfo(Colors.red, 'Severe', theme),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.center,
                child: Text(
                  "Today's Summary",
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: theme,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                elevation: 3,
                margin: const EdgeInsets.all(14),
                child: Padding(
                  padding: const EdgeInsets.all(10.0),
                  child: Obx(
                    () => GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 3,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.7,
                      padding: const EdgeInsets.all(8),
                      children: [
                        _buildInsightCard(
                          context,
                          "Slouchy Posture",
                          controller.slouchyPercent.value,
                          "Good",
                          theme,
                          Colors.blueAccent,
                          Icons.arrow_downward,
                        ),
                        _buildInsightCard(
                          context,
                          "Left Posture",
                          controller.leftPercent.value,
                          "Good",
                          theme,
                          Colors.orange,
                          Icons.arrow_back,
                        ),
                        _buildInsightCard(
                          context,
                          "Right Posture",
                          controller.rightPercent.value,
                          "Good",
                          theme,
                          Colors.deepPurple,
                          Icons.arrow_forward,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.center,
                child: Text(
                  "Weekly Insights",
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: theme,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 3,
                child: Padding(
                  padding: const EdgeInsets.all(12.0),

                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 250,
                        child: Obx(
                          () => SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: SizedBox(
                              width: math.max(
                                controller.weeklyData.length * 60.0,
                                MediaQuery.of(context).size.width - 48,
                              ),
                              child: Container(
                                margin: EdgeInsets.all(10.0),
                                child: BarChart(
                                  BarChartData(
                                    alignment: BarChartAlignment.spaceAround,
                                    maxY: 25,
                                    barTouchData: BarTouchData(
                                      enabled: true,
                                      touchTooltipData: BarTouchTooltipData(
                                        getTooltipItem: (
                                          group,
                                          groupIndex,
                                          rod,
                                          rodIndex,
                                        ) {
                                          final value = rod.toY.toInt();
                                          String title;
                                          Color color;

                                          switch (groupIndex) {
                                            case 0:
                                              title = 'Slouchy';
                                              color = Colors.orange;
                                              break;
                                            case 1:
                                              title = 'Left/Right';
                                              color = Colors.blue;
                                              break;
                                            // case 2:
                                            //   title = 'Air Chambers';
                                            //   color = Colors.green;
                                            //   break;
                                            default:
                                              title = '';
                                              color = Colors.grey;
                                          }

                                          return BarTooltipItem(
                                            '$title\n$value',
                                            TextStyle(color: color),
                                          );
                                        },
                                      ),
                                    ),
                                    titlesData: FlTitlesData(
                                      show: true,
                                      bottomTitles: AxisTitles(
                                        sideTitles: SideTitles(
                                          showTitles: true,
                                          getTitlesWidget: (value, meta) {
                                            return Padding(
                                              padding: const EdgeInsets.only(
                                                top: 8.0,
                                              ),
                                              child: Text(
                                                weekDays[value.toInt()],
                                              ),
                                            );
                                          },
                                          reservedSize: 30,
                                        ),
                                      ),
                                      leftTitles: AxisTitles(
                                        sideTitles: SideTitles(
                                          showTitles: true,
                                          reservedSize: 40,
                                        ),
                                      ),
                                      topTitles: AxisTitles(
                                        sideTitles: SideTitles(
                                          showTitles: false,
                                        ),
                                      ),
                                      rightTitles: AxisTitles(
                                        sideTitles: SideTitles(
                                          showTitles: false,
                                        ),
                                      ),
                                    ),
                                    gridData: FlGridData(show: true),
                                    borderData: FlBorderData(show: false),
                                    barGroups: List.generate(weekDays.length, (
                                      dayIndex,
                                    ) {
                                      final dayData =
                                          controller.weeklyData[dayIndex];
                                      return BarChartGroupData(
                                        x: dayIndex,
                                        groupVertically: false,
                                        barRods: [
                                          BarChartRodData(
                                            toY: dayData.slouchy.toDouble(),
                                            color: Colors.orange,
                                            width: 12,
                                          ),
                                          BarChartRodData(
                                            toY: dayData.leftRight.toDouble(),
                                            color: Colors.blue,
                                            width: 12,
                                          ),
                                          // BarChartRodData(
                                          //   toY: dayData.airChambers.toDouble(),
                                          //   color: Colors.green,
                                          //   width: 12,
                                          // ),
                                        ],
                                      );
                                    }),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        alignment: WrapAlignment.center,
                        spacing: 16,
                        runSpacing: 8,
                        children: [
                          _buildLegendItem(Colors.orange, 'Slouchy'),
                          _buildLegendItem(Colors.blue, 'Left/Right'),
                          // _buildLegendItem(Colors.green, 'Air Chambers'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Align(
                alignment: Alignment.center,
                child: Text(
                  "Monthly Posture Analytics",
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: theme,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Obx(
                () => DropdownButton<DateRange>(
                  value: controller.selectedRange.value,
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
                      value: DateRange.last18,
                      child: Text('Last 18 days'),
                    ),
                    DropdownMenuItem(
                      value: DateRange.last28,
                      child: Text('Last 28 days'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value != null) controller.selectedRange.value = value;
                  },
                ),
              ),
              const SizedBox(height: 16),
              Obx(() {
                final data = controller.currentData;
                final total = data.total.toDouble();
                return Card(
                  elevation: 3,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 220,
                          child: PieChart(
                            PieChartData(
                              sectionsSpace: 0,
                              centerSpaceRadius: 60,
                              sections: [
                                PieChartSectionData(
                                  value: data.normal.toDouble(),
                                  color: Colors.green,
                                  title:
                                      '${((data.normal / total) * 100).toStringAsFixed(1)}%',
                                  radius: 50,
                                  titleStyle: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: theme,
                                  ),
                                ),
                                PieChartSectionData(
                                  value: data.slouchy.toDouble(),
                                  color: Colors.orange,
                                  title:
                                      '${((data.slouchy / total) * 100).toStringAsFixed(1)}%',
                                  radius: 50,
                                  titleStyle: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: theme,
                                  ),
                                ),
                                PieChartSectionData(
                                  value: data.left.toDouble(),
                                  color: Colors.blue[400]!,
                                  title:
                                      '${((data.left / total) * 100).toStringAsFixed(1)}%',
                                  radius: 50,
                                  titleStyle: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: theme,
                                  ),
                                ),
                                PieChartSectionData(
                                  value: data.right.toDouble(),
                                  color: Colors.blue[800]!,
                                  title:
                                      '${((data.right / total) * 100).toStringAsFixed(1)}%',
                                  radius: 50,
                                  titleStyle: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: theme,
                                  ),
                                ),
                                // PieChartSectionData(
                                //   value: data.airChambers.toDouble(),
                                //   color: Colors.teal,
                                //   title:
                                //       '${((data.airChambers / total) * 100).toStringAsFixed(1)}%',
                                //   radius: 50,
                                //   titleStyle: TextStyle(
                                //     fontSize: 12,
                                //     fontWeight: FontWeight.bold,
                                //     color: theme,
                                //   ),
                                // ),
                              ],
                              pieTouchData: PieTouchData(
                                touchCallback:
                                    (FlTouchEvent event, pieTouchResponse) {},
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 12,
                          runSpacing: 8,
                          children: [
                            _pieChartInfo(
                              Colors.green,
                              'Normal (${data.normal})',
                              theme,
                            ),
                            _pieChartInfo(
                              Colors.orange,
                              'Slouchy (${data.slouchy})',
                              theme,
                            ),
                            _pieChartInfo(
                              Colors.blue[400]!,
                              'Left (${data.left})',
                              theme,
                            ),
                            _pieChartInfo(
                              Colors.blue[800]!,
                              'Right (${data.right})',
                              theme,
                            ),
                            // _pieChartInfo(
                            //   Colors.teal,
                            //   'Air Chambers (${data.airChambers})',
                            //   theme,
                            // ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInsightCard(
    BuildContext context,
    String title,
    int value,
    String status,
    Color color,
    Color background,
    IconData icon,
  ) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 3,
      color: background,
      child: Center(
        // padding: const EdgeInsets.only(top: 12.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon(icon, size: 32, color: color),
            // const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w900),
              textAlign: TextAlign.center,
            ),
            // const SizedBox(height: 4),
            Text(
              "$value %",
              style: TextStyle(
                fontSize: 24,
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(Color color, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 12, height: 12, color: color),
        const SizedBox(width: 4),
        Text("$text %"),
      ],
    );
  }

  Widget _pieChartInfo(Color color, String text, Color textColor) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.rectangle,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 12, color: textColor)),
      ],
    );
  }
}

BarChartGroupData makeSeverityGroup(
  int x,
  List<double> values,
  List<Color> colors,
) {
  return BarChartGroupData(
    x: x,
    barRods: List.generate(values.length, (index) {
      return BarChartRodData(
        toY: values[index],
        color: colors[index],
        width: 10,
        borderRadius: BorderRadius.circular(4),
      );
    }),
  );
}
