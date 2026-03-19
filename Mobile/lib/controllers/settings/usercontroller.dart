import 'package:get/get.dart';

class UserController extends GetxController {
  RxString username = ''.obs;
  RxString email = ''.obs;

  void updateUser({required String name, required String email}) {
    username.value = name;
    this.email.value = email;
  }
}
