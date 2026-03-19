import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/auth/login_controller.dart';
import 'package:sitguard/widgets/inputform.dart';
import 'package:sitguard/widgets/passwordfield.dart';
import 'package:sitguard/widgets/submitbutton.dart';

class LoginBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => Logincontroller(), fenix: true);
    //This tells GetX to create an instance of Logincontroller only when it's first needed (lazily).
  }
}

class Login extends GetView<Logincontroller> {
  const Login({super.key});
  @override
  Widget build(BuildContext context) {
    // i will put the controller here instead of outside the context
    // final Logincontroller controller = Get.put(Logincontroller());
    // final Logincontroller controller =
    //     Get.isRegistered<Logincontroller>()
    //         ? Get.find<Logincontroller>()
    //         : Get.put(Logincontroller());

    //This will retrieve the instance that was lazily put into
    // the dependency injection by LoginBinding.
    return Scaffold(
      backgroundColor: Colors.blueGrey[500],
      body: ListView(
        children: [
          Form(
            key: controller.formstate,
            child: Center(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(height: 200),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Image.asset("img/SitGuard.png", height: 80),
                        Text(
                          "SitX",
                          style: TextStyle(
                            color: Colors.black, // White text
                            fontSize: 35,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 30),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: Inputform(
                        hintText: "Type your email",
                        form: controller.email,
                        val: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return "Can't be empty";
                          }

                          return null;
                        },
                        // title: 'Email:',
                        icon: Icons.email,
                        title: 'Email:',
                      ),
                    ),
                    Container(height: 10),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: PasswordFields(
                        hintText: 'Type your password',
                        initialVisible: false,
                        passwordController: controller.password,
                        title: 'Password:',
                        icon: Icons.lock, // Initially hidden
                      ),
                    ),
                    Container(height: 10),
                    Obx(
                      () =>
                          controller.isLoading.value
                              ? const CircularProgressIndicator(
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ), // Make sure this color is visible
                              )
                              : Submitbutton(
                                onPressed: () async {
                                  await controller.Login(context);
                                },
                                title: "LogIn",
                              ),
                    ),
                    Container(height: 10),
                    InkWell(
                      child: Text(
                        "Don't have account? Signup",
                        // style: TextStyle(color: Colors.white),
                      ),
                      onTap: () {
                        // Get.delete<Logincontroller>();
                        Get.toNamed("/signup");
                      },
                    ),

                    InkWell(
                      child: Text(
                        "Forgot password?",
                        //s style: TextStyle(color: Colors.white),
                      ),
                      onTap: () {
                        // Get.delete<Logincontroller>();
                        Get.toNamed("/forget");
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
