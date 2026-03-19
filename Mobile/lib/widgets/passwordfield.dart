import 'package:flutter/material.dart';

// ignore: must_be_immutable
class PasswordFields extends StatefulWidget {
  final String? hintText;
  final bool initialVisible;
  TextEditingController passwordController;
  final String title;
  final IconData? icon;
  PasswordFields({
    super.key,
    this.hintText,
    this.initialVisible = false,
    required this.passwordController,
    required this.title,
    this.icon, // Default to hidden
  });

  @override
  State<PasswordFields> createState() => _PasswordFieldsState();
}

class _PasswordFieldsState extends State<PasswordFields> {
  late bool passwordVisible;

  @override
  void initState() {
    passwordVisible = widget.initialVisible; // Initialize passwordVisible here
    super.initState();
  }

  // @override
  // void dispose() {
  //   widget.passwordController.dispose(); // Dispose the controller
  //   super.dispose();
  // }

  @override
  Widget build(BuildContext context) {
    final Color theme =
        Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: theme,
          ),
        ),
        // const SizedBox(height: 8),
        TextFormField(
          obscureText: !passwordVisible, // Toggle based on passwordVisible
          controller: widget.passwordController,
          style: TextStyle(color: Colors.black),
          decoration: InputDecoration(
            hintStyle: TextStyle(fontSize: 14, color: Colors.grey),
            contentPadding: EdgeInsets.symmetric(vertical: 20, horizontal: 20),
            filled: true,
            fillColor: Colors.grey[100],
            prefixIcon:
                widget.icon != null
                    ? Icon(widget.icon, color: Colors.grey)
                    : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(100),
              borderSide: BorderSide(color: Colors.grey),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(200),
              borderSide: BorderSide(color: Colors.grey),
            ),
            hintText: widget.hintText ?? "Password",
            suffixIcon: IconButton(
              icon: Icon(
                passwordVisible ? Icons.visibility_off : Icons.visibility,
                color: Colors.grey,
              ),
              onPressed: () {
                setState(() {
                  passwordVisible = !passwordVisible;
                });
              },
            ),
            alignLabelWithHint: false,
          ),
          keyboardType: TextInputType.visiblePassword,
          textInputAction: TextInputAction.done,
        ),
      ],
    );
  }

  TextEditingController getController() =>
      widget.passwordController; // Expose the controller
}
