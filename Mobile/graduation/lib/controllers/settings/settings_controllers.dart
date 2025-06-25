import 'package:flutter/material.dart';
import 'package:get/get.dart';

class SettingsControllers extends GetxController {
  var isDarkMode = true.obs;
  var pushNotification = true.obs;

  void toggleTheme(bool value) {
    isDarkMode.value = value;
    Get.changeThemeMode(value ? ThemeMode.dark : ThemeMode.light);
  }

  void toggleNotify(bool value) {
    pushNotification.value = value;
  }
}
