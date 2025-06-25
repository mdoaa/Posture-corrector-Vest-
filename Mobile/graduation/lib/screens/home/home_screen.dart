import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:sitguard/controllers/home/homescreen.dart';
import 'package:sitguard/widgets/Settings/expansionTile.dart';
import 'package:sitguard/widgets/home/PostureScaleWidget.dart';
import 'package:sitguard/widgets/home/active.dart';
import 'package:sitguard/widgets/home/callibration.dart';
import 'package:sitguard/widgets/home/slouchy.dart';
import 'package:sitguard/widgets/home/tips.dart';
import 'package:sitguard/widgets/home/youtube.dart';

class HomeScreenPage extends StatelessWidget {
  final HomeController controller = Get.find();

  HomeScreenPage({super.key});

  final String formattedDate = DateFormat(
    'EEEE, MMMM d, yyyy',
  ).format(DateTime.now());
  final List<String> days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  final String today =
      DateTime.now().weekday == 7
          ? "Sun"
          : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][DateTime.now().weekday -
              1];

  @override
  Widget build(BuildContext context) {
    final Color theme =
        Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    //date view
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 9),
                        child: Text(
                          formattedDate,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: theme.withOpacity(0.8),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 10),
                  //days list
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: List.generate(days.length, (index) {
                      String day = days[index];
                      bool isToday = day == today;

                      return Column(
                        children: [
                          Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isToday ? Colors.green : Colors.grey[300],
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              day,
                              style: TextStyle(
                                color: isToday ? Colors.white : Colors.black,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      );
                    }),
                  ),
                  const SizedBox(height: 20),

                  Align(
                    alignment: Alignment.centerLeft,
                    child: Row(
                      children: [
                        Text(
                          "  Posture Monitor",
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: theme,
                            letterSpacing: 0.5,
                          ),
                        ),
                        SizedBox(width: 100),
                        Obx(
                          () => Icon(
                            controller.wifi.value ? Icons.wifi : Icons.wifi_off,
                            color:
                                controller.wifi.value
                                    ? Colors.green
                                    : Colors.red,
                            size: 30,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),

                    elevation: 4,
                    margin: const EdgeInsets.all(12),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Circular Indicators
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              Obx(
                                () => Expanded(
                                  child: PostureScale(
                                    value:
                                        controller.rightAndLeftSeverity.value,
                                    theme: theme,
                                    label: 'Left and Right',
                                    imageAsset: 'img/frontcropped.png',
                                  ),
                                ),
                              ),
                              Obx(
                                () => Expanded(
                                  child: RightSlouchPostureScale(
                                    value: controller.slouchySeverity.value,
                                    label: " Slouchy",
                                    theme: theme,
                                    imageAsset: "img/side.png",
                                  ),
                                ),
                              ),
                              // RightSlouchPostureScale(
                              //   value: 5,
                              //   label: " Slouchy",
                              //   theme: theme,
                              //   imageAsset: "img/side.png",
                              // ),
                            ],
                          ),

                          const SizedBox(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Obx(
                                      () => Text(
                                        "Right count : ${controller.rCount.value}",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey[500],
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                                    ),
                                    Obx(
                                      () => Text(
                                        "Left count : ${controller.lCount.value}",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey[500],
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Obx(
                                      () => Text(
                                        "Slouchy count : ${controller.sCount.value}",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey[500],
                                          letterSpacing: 0.3,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          Divider(thickness: 0.5, color: theme),
                          IntrinsicHeight(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                Obx(
                                  () => Active(
                                    active: controller.toggleAirChamberActive(),
                                    color:
                                        controller.airChamberActive.value
                                            ? Colors.green
                                            : Colors.red,
                                    title: "AirChamber ",
                                  ),
                                ),

                                VerticalDivider(
                                  thickness: 0.5,
                                  width: 20,
                                  color: theme,
                                ),

                                Obx(
                                  () => Active(
                                    active: controller.toggleVibrationActive(),
                                    color:
                                        controller.vibrationActive.value
                                            ? Colors.green
                                            : Colors.red,
                                    title: "Vibration",
                                  ),
                                ),

                                VerticalDivider(
                                  thickness: 0.4,
                                  width: 20,
                                  color: theme,
                                ),

                                CalibrationWidget(color: theme),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),
                  // Tips Section
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "  Posture Tips",
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: theme,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),

                  _buildDashboardItem(
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ExpandableTile(
                            title: "Slouchy Posture",
                            icon: Icons.airline_seat_recline_normal,
                            children: [
                              buildTipItem(
                                'Try the "90-90-90 rule":\n'
                                    '- Feet flat, knees at 90°\n'
                                    '- Hips at 90° to torso\n'
                                    '- Elbows at 90° when typing',
                                "Engage your core muscles and sit upright.  Avoid rounding your shoulders.",
                              ),
                              YoutubeVideoPlayer(videoId: "u-GeMr7G6ho"),
                            ],
                          ),
                          ExpandableTile(
                            title: "Leaning to Left side",
                            icon: Icons.rotate_left,
                            children: [
                              buildTipItem(
                                'Distribute weight evenly:\n- Sit back fully in your chair\n- Adjust armrests to avoid shoulder tilt',
                                "Favoring the left side can strain your back and hips. Aim for balance and center alignment.",
                              ),
                              YoutubeVideoPlayer(videoId: "l8sKMncjgdw"),
                            ],
                          ),
                          ExpandableTile(
                            title: "Leaning to Right side",
                            icon: Icons.rotate_right,
                            children: [
                              buildTipItem(
                                'Use lumbar support:\n- Support your lower back\n- Avoid leaning on one armrest constantly',
                                "Sitting with more pressure on one side can lead to chronic muscle imbalance.",
                              ),
                              YoutubeVideoPlayer(videoId: "vweg7NXZydc"),
                            ],
                          ),
                          ExpandableTile(
                            title: "Stretching for Desk Users",
                            icon: Icons.accessibility_new,
                            children: [
                              buildTipItem(
                                'Do these every 1-2 hours:\n- Neck rolls\n- Shoulder shrugs\n- Seated spinal twist',
                                "Stretching helps prevent muscle stiffness and reduces fatigue from long sitting hours.",
                              ),
                              YoutubeVideoPlayer(videoId: "EBxV9YDEtAk"),
                            ],
                          ),
                          ExpandableTile(
                            title: "Strengthening for Spinal Health",
                            icon: Icons.fitness_center,
                            children: [
                              buildTipItem(
                                'Try these core exercises:\n- Bird Dog\n- Glute Bridge\n- Plank holds',
                                "A strong core supports your spine and helps maintain upright posture naturally.",
                              ),
                              YoutubeVideoPlayer(videoId: "KOcgp1d6BE8"),
                            ],
                          ),
                          ExpandableTile(
                            title: "Spinal Alignment & Health",
                            icon: Icons.health_and_safety,
                            children: [
                              buildTipItem(
                                'Use a posture reminder:\n- Set app alerts or smartwatch cues\n- Adjust chair and screen height',
                                "Proper spinal alignment reduces wear and tear on discs and promotes healthy nerve function.",
                              ),
                              YoutubeVideoPlayer(videoId: "5R54QoUbbow"),
                            ],
                          ),
                          ExpandableTile(
                            title: "Walking Breaks",
                            icon: Icons.directions_walk,
                            children: [
                              buildTipItem(
                                'Follow the 20-20 rule:\n- Every 20 min, walk for 20 steps or stretch for 20 sec',
                                "Frequent walking improves blood flow and counters the effects of prolonged sitting.",
                              ),
                              YoutubeVideoPlayer(videoId: "0kU2tNCYTsg"),
                            ],
                          ),
                        ],
                      ),
                    ),
                    4, // Span the entire row
                    3, // Make the Tips section tall
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

double convertValueToAngle(double value) {
  // Map -100 to +100 => π to 2π (180° to 360°)
  return math.pi + ((value + 100) / 200) * math.pi;
}

Widget _buildDashboardItem(
  Widget child,
  int crossAxisCellCount,
  int mainAxisCellCount,
) {
  return Container(
    margin: const EdgeInsets.symmetric(vertical: 8.0),
    child: child,
  );
}
