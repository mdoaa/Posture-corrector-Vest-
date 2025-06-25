import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/home/homescreen.dart';

class CalibrationWidget extends StatelessWidget {
  final HomeController controller = Get.put(HomeController());
  final Color color;
  CalibrationWidget({super.key, required this.color});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      int active = controller.callibration.value;
      // final String lastActivationText = controller.getLastActivationString();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(height: 20),

          // Current Status
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 9),
            decoration: BoxDecoration(
              color:
                  active == 0
                      ? Colors.green.withOpacity(0.15)
                      : Colors.grey.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              active == -1
                  ? 'A while ago'
                  : active == 0
                  ? 'Now'
                  : '$active m ago',
              style: TextStyle(
                color: active == 0 ? Colors.green : Colors.grey,
                fontWeight: FontWeight.bold,
                fontSize: 10,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            "Callibration",
            style: TextStyle(
              color: color, // A darker grey for better readability
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 20),

          // Space below for next elements
          // Example button to trigger activation (for demonstration)
        ],
      );
    });
  }
}
