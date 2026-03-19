import 'package:flutter/material.dart';

class Inputform extends StatelessWidget {
  final String title;
  final IconData? icon;
  final String hintText;
  final TextEditingController form;
  final String? Function(String?)? val;
  const Inputform({
    super.key,
    required this.hintText,
    required this.form,
    required this.val,
    required this.title,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        // SizedBox(height: 8),
        TextFormField(
          validator: val,
          controller: form,
          style: TextStyle(color: Colors.black),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: TextStyle(fontSize: 14, color: Colors.grey),
            contentPadding: EdgeInsets.symmetric(vertical: 20, horizontal: 20),
            filled: true,
            fillColor: Colors.grey[100],
            prefixIcon: icon != null ? Icon(icon, color: Colors.grey) : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(50),
              borderSide: BorderSide(color: Colors.grey),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(70),
              borderSide: BorderSide(color: Colors.grey),
            ),
          ),
        ),
      ],
    );
  }
}
