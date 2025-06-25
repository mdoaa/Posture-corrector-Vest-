// import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:sitguard/Services/mongodb.dart';

import '../../controllers/settings/usercontroller.dart';

// import 'package:mongo_dart/mongo_dart.dart';
void showEditProfileDialog() {
  final box = GetStorage();
  final nameController = TextEditingController(text: box.read('username'));
  final emailController = TextEditingController(text: box.read('email'));

  Get.dialog(
    AlertDialog(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: nameController,
            decoration: InputDecoration(labelText: "Name"),
          ),
          TextField(
            controller: emailController,
            enabled: false,
            decoration: InputDecoration(labelText: "Email"),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Get.back(), child: Text('Cancel')),
        ElevatedButton(
          onPressed: () async {
            final newName = nameController.text.trim();
            final email = box.read('email');
            if (newName == box.read('username')) {
              Get.back();
              return;
            }
            final success = await Mongodb.updateProfile(newName, email);
            final userController = Get.find<UserController>();
            if (success) {
              box.write("username", newName);
              userController.updateUser(name: newName, email: email);
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
