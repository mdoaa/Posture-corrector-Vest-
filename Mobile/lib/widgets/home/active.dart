import 'package:flutter/material.dart';

class Active extends StatelessWidget {
  final String active;
  final Color color;
  final String title;

  const Active({
    super.key,
    required this.title,
    required this.color,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(height: 10),
        Container(
          padding: EdgeInsets.symmetric(horizontal: 9, vertical: 9),
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.15),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Icon(Icons.circle, size: 10, color: color),
              SizedBox(width: 5), // Optional spacing between icon and text
              Text(
                active,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: 8),
        Text(title, style: TextStyle(fontSize: 14.0)),
      ],
    );
  }
}
