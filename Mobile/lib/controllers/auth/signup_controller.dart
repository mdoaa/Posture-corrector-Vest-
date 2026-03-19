import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:email_validator/email_validator.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/services/mongodb.dart';
import 'package:sitguard/widgets/auth/otp.dart';

class SignupController extends GetxController {
  final email = TextEditingController();
  final password = TextEditingController();
  final confpassword = TextEditingController();
  final name = TextEditingController();
  final formstate = GlobalKey<FormState>();
  final otpController = TextEditingController();
  var er = "".obs;

  @override
  void onClose() {
    email.dispose();
    password.dispose();
    confpassword.dispose();
    name.dispose();
    otpController.dispose();
    super.onClose();
  }

  Future<void> signup(BuildContext context) async {
    if (!formstate.currentState!.validate()) {
      AwesomeDialog(
        context: context,
        dialogType: DialogType.error,
        animType: AnimType.rightSlide,
        title: 'Error',
        desc: 'Please fill in all required fields',
      ).show();
      return;
    }

    if (password.text != confpassword.text || password.text.length < 8) {
      AwesomeDialog(
        context: context,
        dialogType: DialogType.error,
        animType: AnimType.rightSlide,
        title: 'Invalid password',
        desc: 'Password must be 8+ characters and match confirmation.',
      ).show();
      return;
    }

    if (!EmailValidator.validate(email.text)) {
      AwesomeDialog(
        context: context,
        dialogType: DialogType.error,
        animType: AnimType.rightSlide,
        title: 'Error',
        desc: 'Email is invalid',
      ).show();
      return;
    }

    try {
      final exists = await Mongodb.isEmailExsists(email.text);
      if (exists) {
        AwesomeDialog(
          context: context,
          dialogType: DialogType.error,
          animType: AnimType.rightSlide,
          title: 'Email Taken',
          desc: 'Try a different email address.',
        ).show();
        return;
      }

      final sent = await Mongodb.sendOtp(email.text);
      if (!sent) {
        Get.snackbar(
          "OTP Error",
          "Could not send OTP. Try again later.",
          backgroundColor: Colors.red.shade200,
          colorText: Colors.black,
        );
        return;
      }

      await showOtpDialog(
        context: context,
        email: email.text,
        onSuccess: () async {
          Mongodb mongo = Mongodb(
            name: name.text,
            email: email.text,
            password: password.text,
          );
          await mongo.adduser();
          Get.snackbar(
            "Success",
            "Account created successfully!",
            backgroundColor: Colors.green.shade200,
          );
          Get.offAllNamed("/login", arguments: {'clearStack': true});
        },
      );
    } catch (e) {
      er.value = e.toString();
      AwesomeDialog(
        context: context,
        dialogType: DialogType.error,
        animType: AnimType.rightSlide,
        title: 'Error',
        desc: '$e',
      ).show();
    }
  }
}
