import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:sitguard/Services/mongodb.dart';
import 'package:sitguard/controllers/settings/usercontroller.dart';

class Logincontroller extends GetxController {
  final UserController userController = Get.find<UserController>();

  final email = TextEditingController();
  final password = TextEditingController();
  final formstate = GlobalKey<FormState>();
  final box = GetStorage(); // Storage instance
  var isLoading = false.obs; // Use RxBool for observable boolean
  var er = "".obs; // Use RxString for observable string
  @override
  void onClose() {
    email.clear();
    password.clear();
    super.onClose();
  }
  //instead of disposing it's better to use binding and lazyput

  Future<void> Login(BuildContext context) async {
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
    

    try {
      isLoading.value = true;
      await Future.delayed(
        const Duration(milliseconds: 1500),
      ); // Adjust the duration as needed

      String? accountExists = await Mongodb.isAccountExists(
        email.text,
        password.text,
      );
      if (accountExists != null) {
        userController.updateUser(name: accountExists, email: email.text);
        box.write('isLoggedIn', true);
        box.write('email', email.text);
        box.write("username", accountExists);
        Get.offAllNamed("/home");
      } else {
        AwesomeDialog(
          context: context,
          dialogType: DialogType.error,
          animType: AnimType.rightSlide,
          title: 'Invalid Credentials',
          desc: 'Incorrect email or password! ',
        ).show();
        // return;
      }
    } catch (e) {
      er.value = e.toString();
      AwesomeDialog(
        context: context,
        dialogType: DialogType.error,
        animType: AnimType.rightSlide,
        title: 'Error',
        desc: '$e',
      ).show();
    } finally {
      isLoading.value = false; // Ensure loading is false even on error
    }
  }
}
