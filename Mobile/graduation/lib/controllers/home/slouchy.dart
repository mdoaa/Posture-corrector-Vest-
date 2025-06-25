import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class RightSlouchController extends GetxController
    with GetTickerProviderStateMixin {
  late AnimationController animationController;
  late Animation<double> angleAnimation;

  double value = 0.0;
  double currentAngle = 0.0;

  void init(double initialValue) {
    value = initialValue;
    currentAngle = -math.pi / 2 + (value / 100) * math.pi;

    animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    updateAnimation(value);
  }

  void updateValue(double newValue) {
    newValue = newValue.clamp(0.0, 100.0); // 👈 Ensure it's within range
    if (value == newValue) return;
    value = newValue;
    updateAnimation(newValue);
  }

  void updateAnimation(double newValue) {
    final newAngle = -math.pi / 2 + (newValue / 100) * math.pi;

    angleAnimation = Tween<double>(begin: currentAngle, end: newAngle).animate(
      CurvedAnimation(parent: animationController, curve: Curves.easeOutCubic),
    )..addListener(() {
      currentAngle = angleAnimation.value;
      update(); // notify the UI
    });

    animationController.forward(from: 0);
  }

  @override
  void onClose() {
    animationController.dispose();
    super.onClose();
  }
}
