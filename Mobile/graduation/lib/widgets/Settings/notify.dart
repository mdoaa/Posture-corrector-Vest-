import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/settings/settings_controllers.dart';

class Notify extends StatelessWidget {
  final SettingsControllers controller = Get.find();
  Notify({super.key});
  @override
  Widget build(BuildContext context) {
    return Obx(
      () => ListTile(
        leading: const Icon(
          Icons.notifications_active_outlined,
          color: Colors.blueGrey,
        ),
        title: const Text("Push Notification"),
        trailing: Switch(
          inactiveThumbColor: Colors.grey,
          inactiveTrackColor: Colors.grey[200],
          value: controller.pushNotification.value,
          onChanged: controller.toggleNotify,
        ),
      ),
    );
  }
}
