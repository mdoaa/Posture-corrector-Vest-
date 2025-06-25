import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/auth/forgetpassword_controller.dart';
import 'package:sitguard/widgets/inputform.dart';
import 'package:sitguard/widgets/passwordfield.dart';
import 'package:sitguard/widgets/submitbutton.dart';

class ForgetPassword extends StatelessWidget {
  final ForgetPasswordController controller =
      Get.find<ForgetPasswordController>();

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
            key: controller.state,
            child: Center(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(height: 100),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: Text(
                        "Update Password",
                        style: TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    SizedBox(height: 10),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: Inputform(
                        hintText: "Enter your email",
                        form: controller.email,
                        val: (val) {
                          if (val == "") {
                            return "Can't be empty";
                          }
                          return null;
                        },
                        // title: 'Email :',
                        icon: Icons.email,
                        title: 'Email:',
                      ),
                    ),
                    SizedBox(height: 10),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: PasswordFields(
                        hintText: 'Enter your new password',
                        initialVisible: false,
                        passwordController: controller.password,
                        title: 'Password',
                        icon: Icons.lock, // Initially hidden
                      ),
                    ),
                    SizedBox(height: 10),
                    SizedBox(
                      width: MediaQuery.of(context).size.width * 0.9,
                      child: PasswordFields(
                        hintText: 'Confirm your new password',
                        initialVisible: false,
                        passwordController: controller.confirmPassword,
                        title: 'Confirm new Password',
                        icon: Icons.lock,
                      ),
                    ),
                    SizedBox(height: 10),
                    Submitbutton(
                      onPressed: () {
                        controller.forgetPassword(context);
                      },
                      title: "Update password",
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
