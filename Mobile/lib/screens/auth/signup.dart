import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/auth/signup_controller.dart';
import 'package:sitguard/widgets/inputform.dart';
import 'package:sitguard/widgets/passwordfield.dart';
import 'package:sitguard/widgets/submitbutton.dart';

class SignupBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut(() => SignupController());
  }
}

// ignore: must_be_immutable
class signup extends StatelessWidget {
  final SignupController controller = Get.find<SignupController>();
  // bool passwordVisible = false;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blueGrey[500],
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: Icon(Icons.arrow_back, color: Colors.black),
        ),
      ),
      body: ListView(
        children: [
          Form(
            key: controller.formstate,
            child: Center(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(height: 100),
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
                    Container(height: 15),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: Inputform(
                        hintText: "Username",
                        form: controller.name,
                        val: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return "Can't be empty";
                          }

                          return null;
                        },
                        // title: 'Username:',
                        icon: Icons.person,
                        title: 'Username:',
                      ),
                    ),
                    Container(height: 15),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: Inputform(
                        hintText: "your_email@example.com",
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
                    Container(height: 15),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: PasswordFields(
                        hintText: 'e.g., Abc123',
                        initialVisible: false,
                        passwordController: controller.password,
                        title: 'Password:',
                        icon: Icons.lock,
                      ),
                    ),
                    Container(height: 15),

                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: PasswordFields(
                        hintText: 'Re-enter password',
                        initialVisible: false,
                        passwordController: controller.confpassword,
                        title: 'Confirm Password:',
                        icon: Icons.lock, // Initially hidden
                      ),
                    ),
                    Container(height: 15),

                    Submitbutton(
                      onPressed: () async {
                        await controller.signup(context);
                      },
                      title: "signup",
                    ),
                    Container(height: 15),
                    InkWell(
                      child: Text(
                        "Have account? Login",
                        // style: TextStyle(color: Colors.white),
                      ),
                      onTap: () {
                        //                      Get.put(Logincontroller(), permanent: false);
                        Get.offAllNamed("/login");
                        // Get.offNamedUnofftil('/login', (route) => false);
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
