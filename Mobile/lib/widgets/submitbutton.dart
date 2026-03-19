import 'package:flutter/material.dart';

class Submitbutton extends StatelessWidget {
  final void Function()? onPressed;
  final String title;
  const Submitbutton({super.key, required this.onPressed, required this.title});

  @override
  Widget build(BuildContext context) {
    return MaterialButton(
      height: 40,
      onPressed: onPressed,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
      color: Colors.blueGrey[500],
      child: Text(title, style: TextStyle(color: Colors.white, fontSize: 20)),
      padding: EdgeInsets.symmetric(horizontal: 50, vertical: 2),
    );
  }
}
