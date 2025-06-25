import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:sitguard/controllers/settings/usercontroller.dart';
// import 'package:sitguard/widgets/custominkwell.dart';
import 'package:sitguard/widgets/Settings/expansionTile.dart';
import 'package:sitguard/widgets/Settings/notify.dart';
import 'package:sitguard/widgets/Settings/showedit.dart';
import 'package:sitguard/widgets/Settings/theme.dart';
import 'package:sitguard/widgets/Settings/updatepassword.dart';
// import 'package:sitguard/widgets/showedit.dart';

class SettingsScreen extends StatelessWidget {
  SettingsScreen({super.key});
  final box = GetStorage();
  final UserController userController = Get.find();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // backgroundColor: Colors.grey[300],
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: ListView(
        padding: EdgeInsets.all(15),
        children: [
          Container(height: 40),

          //profile
          Title(
            color: Colors.blueGrey,
            child: Text(
              "Profile",
              style: TextStyle(
                color: Colors.blueGrey,
                fontWeight: FontWeight.bold,
                fontSize: 20.0,
              ),
            ),
          ),
          Container(height: 10),

          Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 15),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Obx(
                  () => RichText(
                    text: TextSpan(
                      text: "${userController.username.value} \n",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 25,
                        color:
                            Theme.of(context).textTheme.bodyLarge?.color ??
                            Colors.black,
                      ),
                      children: [
                        TextSpan(
                          text: userController.email.value,
                          style: TextStyle(
                            fontSize: 15,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Divider(thickness: 1.0, color: Colors.grey),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        child: Text(
                          "Edit Profile",
                          style: TextStyle(color: Colors.blueGrey),
                        ),
                        onTap: () {
                          showEditProfileDialog();
                        },
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        child: Text(
                          "Update Password",
                          style: TextStyle(color: Colors.blueGrey),
                          textAlign: TextAlign.end,
                        ),
                        onTap: () {
                          updatePasswordDialog();
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              container(context, ThemeT()),
              container(context, Notify()),
            ],
          ),

          Container(height: 10),

          //Help
          Title(
            color: Colors.blueGrey,
            child: Text(
              "Help",
              style: TextStyle(
                color: Colors.blueGrey,
                fontWeight: FontWeight.bold,
                fontSize: 20.0,
              ),
            ),
          ),
          Container(height: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ExpandableTile(
                title: "About sitx",
                icon: Icons.info,
                children: [
                  Container(
                    child: Text(
                      "SitX is a smart wearable posture correction system designed to help users maintain healthy sitting habits. The system includes a vest embedded with sensors that detect slouching or leaning, and responds in real-time using vibration and air chambers to alert the user. SitX integrates with a mobile application that visualizes posture data, gives insights, and helps users track their progress over time.",
                    ),
                  ),
                ],
              ),
              // Divider(thickness: 1.0, color: Colors.grey),
              ExpandableTile(
                title: "How to use",
                icon: Icons.play_circle_fill_outlined,
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: TextSpan(
                            style: TextStyle(
                              fontSize: 16.0,
                              color:
                                  Theme.of(
                                    context,
                                  ).textTheme.bodyLarge?.color ??
                                  Colors.black,
                              // color: Colors.black87,
                            ), // Default style
                            children: [
                              TextSpan(
                                text: "1. ",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text:
                                    "Wear the SitX Jacket comfortably and ensure it fits snugly.\n\n",
                              ),
                              TextSpan(
                                text: "2. ",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text:
                                    "Connect the jacket to the SitX mobile app via Bluetooth or Wi-Fi.\n\n",
                              ),
                              TextSpan(
                                text: "3. ",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text:
                                    "Calibrate your sitting posture using the in-app guide.\n\n",
                              ),
                              TextSpan(
                                text: "4.",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text:
                                    "Begin Monitoring – the system will track your posture continuously.\n\n",
                              ),
                              TextSpan(
                                text: "5.",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text:
                                    "If poor posture is detected, the jacket will gently adjust your alignment.\n\n",
                              ),
                              TextSpan(
                                text: "6.",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text:
                                    "Use the app to track progress, view analytics, and adjust settings like sensitivity or reminder intervals.\n\n",
                              ),
                              // ... and so on
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              // Divider(thickness: 1.0, color: Colors.grey),
              ExpandableTile(
                title: "FAQs",
                icon: Icons.quiz_outlined,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16.0),
                    child: RichText(
                      text: TextSpan(
                        style: TextStyle(
                          fontSize: 16.0,
                          color:
                              Theme.of(context).textTheme.bodyLarge?.color ??
                              Colors.black,
                        ),
                        children: [
                          TextSpan(
                            text: "Q1: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(
                            text:
                                "Is SitX suitable for long sitting sessions?\n",
                          ),
                          TextSpan(
                            text: "A: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(
                            text:
                                "Yes, SitX is designed to support posture during extended use and will alert you only when necessary to prevent fatigue.\n\n",
                          ),
                          TextSpan(
                            text: "Q2: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(text: "Can I wash the SitX jacket?\n"),
                          TextSpan(
                            text: "A: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(
                            text:
                                "The jacket is partially washable. Please detach the electronic module before washing.\n\n",
                          ),
                          TextSpan(
                            text: "Q3: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(text: "Does SitX work without internet?\n"),
                          TextSpan(
                            text: "A: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(
                            text:
                                "Yes, SitX can function offline once the initial setup and calibration are completed.\n\n",
                          ),
                          TextSpan(
                            text: "Q4: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(
                            text:
                                "What should I do if my jacket stops adjusting?\n",
                          ),
                          TextSpan(
                            text: "A: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(
                            text:
                                "Make sure it's charged and connected to the app. You can also recalibrate in the device settings.\n",
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              // Divider(thickness: 1.0, color: Colors.grey),
              ExpandableTile(
                title: "Customer Support",
                icon: Icons.headset_mic,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16.0),
                    child: RichText(
                      text: TextSpan(
                        style: TextStyle(
                          fontSize: 16.0,
                          color:
                              Theme.of(context).textTheme.bodyLarge?.color ??
                              Colors.black,
                        ),
                        children: [
                          TextSpan(
                            text: "📧 Email: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(text: "support@sitx.tech\n"),
                          TextSpan(
                            text: "📞 Hotline: ",
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(text: "+20 123 456 789\n"),
                          TextSpan(text: " \t Cairo , Egypt"),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          Container(height: 20),
          Center(
            child: InkWell(
              child: Text(
                "Logout",
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color:
                      Theme.of(context).textTheme.bodyLarge?.color ??
                      Colors.black,
                ),
              ),
              onTap: () {
                box.erase(); // Clear stored login credentials
                Get.offNamed("/login");
              },
            ),
          ),
        ],
      ),
    );
  }
}

Widget container(BuildContext context, Widget child) {
  return Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
    decoration: BoxDecoration(
      // color: Colors.white,
      color: Theme.of(context).cardColor,

      borderRadius: BorderRadius.circular(12),
    ),
    child: child,
  );
}
