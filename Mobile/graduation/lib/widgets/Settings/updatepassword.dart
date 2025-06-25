// import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/settings/updatepassword.dart';
import 'package:sitguard/widgets/passwordfield.dart';

// import 'package:mongo_dart/mongo_dart.dart';

void updatePasswordDialog() {
  // final UserController userController = Get.find();
  final UpdatePasswordController controller =
      Get.find<UpdatePasswordController>();
  Get.dialog(
    AlertDialog(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          PasswordFields(
            hintText: 'Enter your Current password',
            initialVisible: false,
            passwordController: controller.currentPassword,
            title: 'Current Password',
            icon: Icons.lock, // Initially hidden
          ),
          PasswordFields(
            hintText: 'Enter your new password',
            initialVisible: false,
            passwordController: controller.password,
            title: 'New Password',
            icon: Icons.lock, // Initially hidden
          ),
          PasswordFields(
            
            hintText: 'Confirm your new password',
            initialVisible: false,
            passwordController: controller.confirmPassword,
            title: 'Confirm new Password',
            icon: Icons.lock, // Initially hidden
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Get.back(), child: Text('Cancel')),
        ElevatedButton(
          onPressed: () async {
            final update = await controller.updatePassword();
            // final userController = Get.find<UserController>();

            if (update) {
              // 🔥 Update in real time
              Get.back();
              Get.snackbar('Success', 'Profile updated');
            } else {
              Get.snackbar("Error", 'Failed to update profile');
            }
          },
          child: Text("Save"),
        ),
      ],
    ),
  );
}
