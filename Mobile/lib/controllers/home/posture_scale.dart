// import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class PostureController extends GetxController
    with GetTickerProviderStateMixin {
  late AnimationController animationController;
  late Animation<double> angleAnimation;

  final RxDouble currentAngle = 180.0.obs;
  double value = 0.0;

  void init(double initialValue) {
    value = initialValue;
    currentAngle.value = _calculateAngle(initialValue);

    animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
  }

  
  double _calculateAngle(double value) {
    // Normalize the value from -100 to 100 to a 0-1 range
    final normalizedValue =
        (value + 100) / 200; // This will map -100 to 0, 0 to 0.5, 100 to 1

    // Map the normalized value to the angle range of the arc (180 to 360 degrees)
    // 180 degrees (math.pi) is the start, 360 degrees (2*math.pi) is the end
    return (normalizedValue * 179.99) +
        180; // This will give you angles from 180 to 360
  }

  void updateValue(double newValue) {
    newValue = newValue.clamp(-100.0, 100.0);

    if (newValue == value) return;

    final newAngle = _calculateAngle(newValue);
    angleAnimation = Tween<double>(
      begin: currentAngle.value,
      end: newAngle,
    ).animate(
      CurvedAnimation(parent: animationController, curve: Curves.easeOutCubic),
    )..addListener(() {
      currentAngle.value = angleAnimation.value;
    });

    animationController.forward(from: 0);
    value = newValue;
  }

  @override
  void onClose() {
    animationController.dispose();
    super.onClose();
  }
}
