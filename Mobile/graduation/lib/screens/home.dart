import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:sitguard/controllers/home/bottomnav.dart';
import 'package:sitguard/controllers/settings/usercontroller.dart';

// ignore: must_be_immutable
class Home extends StatelessWidget {
  Home({super.key});
  final box = GetStorage(); // Storage instance
  final UserController userController = Get.find<UserController>();
  final BottomNavController bottomNavController = Get.put(
    BottomNavController(),
  );
  // Instantiate the controller

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      bottomNavigationBar: Obx(
        () => BottomNavigationBar(
          backgroundColor: Theme.of(context).scaffoldBackgroundColor,
          selectedItemColor: Colors.blueGrey[300],
          currentIndex: bottomNavController.curIndex.value,
          onTap: bottomNavController.changeTabIndex,
          items: [
            BottomNavigationBarItem(icon: Icon(Icons.home), label: "Home"),
            BottomNavigationBarItem(icon: Icon(Icons.insights), label: "State"),
            BottomNavigationBarItem(
              icon: Icon(Icons.settings),
              label: "Settings",
            ),
          ],
        ),
      ),
      appBar: AppBar(
        backgroundColor: Colors.blueGrey[300],
        title: Obx(
          () => Text(
            " Hello, ${userController.username.value}!",
            style: TextStyle(color: Colors.white),
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () {
              box.erase(); // Clear stored login credentials
              Get.offNamed("/login"); // Navigate to login
            },
          ),
        ],
      ),
      // body:
      //     Center(),
      body: Obx(() => bottomNavController.currentPage),
      // to display the current page depending on the index  of the bottom navigator button that is selected
    );
  }
}
