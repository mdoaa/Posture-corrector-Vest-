import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:sitguard/controllers/home/homescreen.dart';
import 'package:sitguard/controllers/sensors_controller.dart';
import 'package:sitguard/controllers/settings/settings_controllers.dart';
import 'package:sitguard/controllers/settings/updatepassword.dart';
import 'package:sitguard/controllers/settings/usercontroller.dart';
import 'package:sitguard/screens/auth/forgetpassword.dart';
import 'package:sitguard/screens/home.dart';
import 'package:sitguard/screens/auth/login.dart';
import 'package:sitguard/screens/auth/signup.dart';
import 'controllers/auth/forgetpassword_controller.dart';

void main() async {
  // WidgetsFlutterBinding.ensureInitialized();
  await GetStorage.init();
  // Get.put(SettingsControllers());
  // Get.put(HomeController());
  // Get.put(ForgetPasswordController());
  // Get.put(UpdatePasswordController());
  // Get.put(Sensors());
  Get.lazyPut(() => SettingsControllers(), fenix: true);
  Get.lazyPut(() => HomeController());
  Get.lazyPut(() => ForgetPasswordController());
  Get.lazyPut(() => UpdatePasswordController());
  // Get.lazyPut(() => Sensors());
  Get.put(Sensors()).initSocketConnection(); // Usually done in main() or bindings

  Get.lazyPut(() => UserController(), fenix: true); // Use lazyPut

  final box = GetStorage();
  final userController = Get.find<UserController>();
  userController.updateUser(
    name: box.read('username') ?? '',
    email: box.read('email') ?? '',
  );
  bool isLoggedIn = box.read('isLoggedIn') ?? false;
  runApp(MyApp(isLoggedIn: isLoggedIn));
}

class MyApp extends StatelessWidget {
  final bool isLoggedIn;
  const MyApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SettingsControllers>(
      builder: (settingsController) {
        return GetMaterialApp(
          title: 'SitX',
          theme: ThemeData(
            brightness: Brightness.light,
            fontFamily: "Lato",
            colorScheme: ColorScheme.fromSwatch(
              primarySwatch: Colors.blueGrey,
            ).copyWith(secondary: Colors.orange),
          ),
          darkTheme: ThemeData(
            fontFamily: "Lato",
            brightness: Brightness.dark,
            primaryColor: Colors.white,
            colorScheme: ColorScheme.fromSwatch(
              primarySwatch: Colors.blueGrey,
              brightness: Brightness.dark,
            ).copyWith(secondary: Colors.orange),
          ),
          themeMode:
              settingsController.isDarkMode.value
                  ? ThemeMode.dark
                  : ThemeMode.light,
          initialRoute: isLoggedIn ? '/home' : '/login',
          getPages: [
            GetPage(name: "/home", page: () => Home(), binding: HomeBinding()),
            GetPage(
              name: "/login",
              page: () => const Login(),
              binding: LoginBinding(),
            ),
            GetPage(
              name: "/signup",
              page: () => signup(),
              binding: SignupBinding(),
            ),
            GetPage(name: "/forget", page: () => ForgetPassword()),
          ],
        );
      },
    );
  }
}
