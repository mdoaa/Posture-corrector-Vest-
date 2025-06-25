import 'package:flutter/material.dart';
// import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import 'package:sitguard/Services/mongodb.dart';

Future<void> showOtpDialog({
  required BuildContext context,
  required String email,
  required VoidCallback onSuccess,
}) async {
  final TextEditingController otpController = TextEditingController();
  await showDialog(
    context: context,
    barrierDismissible: false,
    builder: (BuildContext context) {
      return AlertDialog(
        title: const Text("Enter OTP"),
        content: TextField(
          controller: otpController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: "6-digit OTP"),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              final success = await Mongodb.verifyOtp(email, otpController.text);
              if (success) {
                Navigator.of(context).pop();
                onSuccess();
              } else {
                Get.snackbar("Invalid OTP", "Please try again.", backgroundColor: Colors.red.shade200);
              }
            },
            child: const Text("Verify"),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("Cancel"),
          ),
        ],
      );
    },
  );
}
