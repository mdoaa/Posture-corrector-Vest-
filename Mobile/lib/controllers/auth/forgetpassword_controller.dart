import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/Services/mongodb.dart';
import 'package:sitguard/widgets/auth/otp.dart';

class ForgetPasswordController extends GetxController {
  final email = TextEditingController();
  final password = TextEditingController();
  final confirmPassword = TextEditingController();
  final otpController = TextEditingController();
  final state = GlobalKey<FormState>();
  var er = ''.obs; //obs=observable

  //instead of dispose in getx we use onClose
  // i removed the change notifier and the notifylisteners as the getx handles ui automatically

  @override
  void onClose() {
    email.dispose();
    password.dispose();
    confirmPassword.dispose();
    super.onClose();
  }

  Future<void> forgetPassword(dynamic context) async {
    // bool emailExsits = await Mongodb.isEmailExsists(email.text);
    if (!state.currentState!.validate()) {
      AwesomeDialog(
        context: context,
        dialogType: DialogType.error,
        animType: AnimType.rightSlide,
        title: 'Error',
        desc: 'Please fill in all required fields',
      ).show();
      return;
    }
    try {
      if (password.text == confirmPassword.text) {
        // final updated = await Mongodb.updatePassword(email.text, password.text);
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
            await Mongodb.updatePassword(email.text, password.text);
            Get.snackbar(
              "Success",
              "Password Updated successfully!",
              backgroundColor: Colors.green.shade200,
            );
            Get.offAllNamed("/login");
          },
        );
        //   if (updated) {
        //     AwesomeDialog(
        //       context: context,
        //       dialogType: DialogType.success,
        //       animType: AnimType.rightSlide,
        //       title: 'Updated',
        //       desc: 'Password updated successfully',
        //       btnOkOnPress: () {
        //         Get.back();
        //       },
        //     ).show();
        //   } else {
        //     AwesomeDialog(
        //       context: context,
        //       dialogType: DialogType.error,
        //       animType: AnimType.rightSlide,
        //       title: 'Error',
        //       desc: 'Email not found. Please register.',
        //     ).show();
        //   }
        // } else {
        //   AwesomeDialog(
        //     context: context,
        //     dialogType: DialogType.error,
        //     animType: AnimType.rightSlide,
        //     title: 'Error',
        //     desc: 'Passwords do not match',
        //   ).show();
      }
    } catch (e) {
      er.value = e.toString();
      AwesomeDialog(
        context: context,
        dialogType: DialogType.error,
        animType: AnimType.rightSlide,
        title: 'Error',
        desc: '$er',
      ).show();
    }
  }
}
