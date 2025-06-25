 import 'package:flutter/material.dart';

Widget buildTipItem(String title, String description) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 4),
        Text(
          description,
          style: const TextStyle(fontSize: 14),
        ),
        const SizedBox(height: 8), // Add some spacing after each tip
      ],
    );
  }