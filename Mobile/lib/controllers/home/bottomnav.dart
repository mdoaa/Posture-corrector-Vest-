import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/screens/home/home_screen.dart';
import 'package:sitguard/screens/home/state_screen.dart';
import 'package:sitguard/screens/home/settings_screen.dart';

class BottomNavController extends GetxController {
  var curIndex = 0.obs;
  void changeTabIndex(int index) {
    curIndex.value = index;
  }

  final List<Widget> pages = [
    // Center(child: Text('Home')),
    // Center(child: Text("State")),
    // Center(child: Text("Support")),
    HomeScreenPage(),
    StateScreenPage(),
    SettingsScreen(),
  ];
  Widget get currentPage => pages[curIndex.value];
}
