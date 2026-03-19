import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import 'package:sitguard/Services/mongodb.dart';

class UpdatePasswordController extends GetxController {
  final currentPassword = TextEditingController();
  final password = TextEditingController();
  final confirmPassword = TextEditingController();
  final state = GlobalKey<FormState>();
  var er = ''.obs; //obs=observable

  Future<bool> updatePassword() async {
    // // bool emailExsits = await Mongodb.isEmailExsists(email.text);
    // if (!state.currentState!.validate()) {
    //   return false;
    // }
    try {
      if (password.text == confirmPassword.text) {
        final update = await Mongodb.updatePasswordd(
          currentPassword.text,
          password.text,
        );
        if (update) {
          currentPassword.clear();
          password.clear();
          confirmPassword.clear();
          return true;
        }
        return false;
      } else {
        return false;
      }
    } catch (e) {
      er.value = e.toString();
    }
    return false;
  }
}
