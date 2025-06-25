import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/settings/settings_controllers.dart';

class ThemeT extends StatelessWidget {
  final SettingsControllers controller = Get.find<SettingsControllers>();
  ThemeT({super.key});
  @override
  Widget build(BuildContext context) {
    return Obx(
      () => ListTile(
        leading: const Icon(Icons.dark_mode_outlined, color: Colors.blueGrey),
        title: const Text("Dark Mode"),
        trailing: Switch(
          inactiveThumbColor: Colors.grey,
          inactiveTrackColor: Colors.grey[200],
          value: controller.isDarkMode.value,
          onChanged: controller.toggleTheme,
        ),
      ),
    );
  }
}
