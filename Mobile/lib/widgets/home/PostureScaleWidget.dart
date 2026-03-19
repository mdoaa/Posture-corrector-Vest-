import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/home/posture_scale.dart';

class PostureScale extends StatelessWidget {
  final double value;
  final String label;
  final Color theme;
  final String imageAsset;

  final PostureController controller = Get.put(PostureController());

  PostureScale({
    super.key,
    required this.value,
    required this.label,
    required this.theme,
    required this.imageAsset,
  }) {
    controller.init(value);
  }

  @override
  Widget build(BuildContext context) {
    controller.updateValue(value);

    return Obx(() {
      // final angle = controller.currentAngle.value;
      final double scaleWidth = MediaQuery.of(context).size.width * 0.44;
      final double arcRadius = scaleWidth / 2;
      final angle = controller.currentAngle.value;
      final angleRadians = angle * math.pi / 180; // Add pi to rotate correctly
      final double strokeWidth = 18.0; // Get the stroke width from your painter
      final double pointerRadius =
          arcRadius -
          (strokeWidth /
              4); // Adjust pointer radius to be at the center of the stroke

      final center = Offset(arcRadius, arcRadius);
      final pointerX = center.dx + pointerRadius * math.cos(angleRadians);
      final pointerY = center.dy + pointerRadius * math.sin(angleRadians);

      return Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: theme,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: scaleWidth,
            height: scaleWidth,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: Size(scaleWidth, angleRadians),
                  painter: _EnhancedHalfCirclePainter(
                    pointerAngle: angleRadians,
                    value: value,
                  ),
                ),
                Positioned(
                  top: angleRadians,
                  child: Image.asset(
                    imageAsset,
                    width: 100,
                    height: 160,
                    color: theme.withOpacity(0.8),
                  ),
                ),
                Positioned(
                  left: pointerX - (30 / 2),
                  top: pointerY - (24 / 2),
                  child: Container(
                    width: 30,
                    height: 24,
                    decoration: BoxDecoration(
                      color: _getSeverityColor(value),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 3),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 6,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          // const SizedBox(height: 16),
          _buildSeverityIndicator(value),
        ],
      );
    });
  }

  Widget _buildSeverityIndicator(double value) {
    final severity = _getSeverityText(value);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: _getSeverityColor(value).withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        severity,
        style: TextStyle(
          color: _getSeverityColor(value),
          fontWeight: FontWeight.bold,
          fontSize: 14,
        ),
      ),
    );
  }

  String _getSeverityText(double val) {
    final absValue = val.abs();
    if (absValue < 10) return 'Normal';
    if (absValue < 30) return 'Moderate';
    return 'Severe';
  }

  Color _getSeverityColor(double val) {
    final absValue = val.abs();
    if (absValue < 10) return Colors.green;
    if (absValue < 30) return Colors.orange;
    return Colors.red;
  }
}

class _EnhancedHalfCirclePainter extends CustomPainter {
  final double pointerAngle;
  final double value;

  _EnhancedHalfCirclePainter({required this.pointerAngle, required this.value});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height);
    final radius = size.width / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    // Background glow
    final glowPaint =
        Paint()
          ..color = Colors.grey.withOpacity(0.1)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawArc(rect, math.pi, math.pi, false, glowPaint);

    // Main arc with smooth gradient
    final gradientPaint =
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 18
          ..strokeCap = StrokeCap.round
          ..shader = SweepGradient(
            colors: [
              Colors.red,
              Colors.orange,
              Colors.green,
              Colors.green,
              Colors.orange,
              Colors.red,
            ],
            stops: const [0.0, 0.40, 0.45, 0.55, 0.65, 1.0],
            startAngle: math.pi,
            endAngle: 2 * math.pi,
          ).createShader(rect);

    canvas.drawArc(rect, math.pi, math.pi + 0.01, false, gradientPaint);

    // Enhanced labels with better typography
    const labels = ["Severe", "Mild", "Normal", "Mild", "Severe"];
    const labelAngles = [180, 216, 252, 288, 324];
    final textStyle = TextStyle(
      color: Colors.black.withOpacity(0.8),
      fontSize: 11,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.5,
    );

    for (int i = 0; i < labels.length; i++) {
      final angle = labelAngles[i] * (math.pi / 180);
      final labelRadius = radius + 16;
      final x = center.dx + labelRadius * math.cos(angle);
      final y = center.dy + labelRadius * math.sin(angle);

      final textPainter = TextPainter(
        text: TextSpan(
          // text: labels[i],
          style: textStyle,
        ),
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.center,
      )..layout();

      textPainter.paint(
        canvas,
        Offset(x - textPainter.width / 2, y - textPainter.height / 2),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
