import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sitguard/controllers/home/slouchy.dart';

class RightSlouchPostureScale extends StatelessWidget {
  final double value; // 0 to 100
  final String label;
  final Color theme;
  final String imageAsset;

  const RightSlouchPostureScale({
    super.key,
    required this.value,
    required this.label,
    required this.theme,
    required this.imageAsset,
  });

  String _getSeverityText(double value) {
    if (value < 10) return "Normal";
    if (value < 20) return "Mild";
    if (value < 40) return "Moderate";
    return "Severe";
  }

  Color _getSeverityColor(double value) {
    if (value < 10) return Colors.green;
    if (value < 20) return Colors.orange;
    if (value < 40) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<RightSlouchController>(
      init: RightSlouchController()..init(value),
      builder: (controller) {
        controller.updateValue(value); // keep updating from parent

        final double scaleWidth = MediaQuery.of(context).size.width * 0.4;
        final double scaleRadius = scaleWidth / 2;

        final angleRadians = controller.angleAnimation.value;
        final double strokeWidth = 16.0;
        final double adjustedRadius = scaleRadius - strokeWidth / 2;

        final double pointerLength = adjustedRadius - 4;
        final double pointerX =
            scaleRadius + pointerLength * math.cos(angleRadians);
        final double pointerY =
            scaleRadius + pointerLength * math.sin(angleRadians);

        return Column(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: theme,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: scaleRadius * 2 + 20,
              height: scaleRadius * 2,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    size: Size(scaleRadius * 2, scaleRadius * 2),
                    painter: _RightSlouchHalfPainter(),
                  ),
                  Positioned(
                    top: scaleRadius - 60,
                    left: scaleRadius - 50,
                    child: Image.asset(
                      imageAsset,
                      width: 120,
                      height: 120,
                      color: theme.withOpacity(0.8),
                      fit: BoxFit.contain,
                    ),
                  ),
                  Positioned(
                    left: pointerX - 15,
                    top: pointerY - 11.5,
                    child: Container(
                      width: 50,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _getSeverityColor(value),
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black26,
                            blurRadius: 6,
                            offset: Offset(0, 3),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: _getSeverityColor(value).withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(width: 6),
                  Text(
                    _getSeverityText(value),
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: _getSeverityColor(value),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RightSlouchHalfPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final radius = size.width / 2;
    final center = Offset(radius, radius);
    final strokeWidth = 16.0;
    final adjustedRadius = radius - strokeWidth / 2;
    final rect = Rect.fromCircle(center: center, radius: adjustedRadius);

    final paint =
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth
          ..shader = SweepGradient(
            startAngle: 0,
            endAngle: math.pi,
            colors: [
              Colors.green,
              Colors.green,
              Colors.orange,
              Colors.orange,
              Colors.red,
              Colors.red,
            ],
            stops: [0.0, 0.05, 0.15, 0.30, 0.50, 1.0],
            transform: GradientRotation(-math.pi / 2),
          ).createShader(rect);

    // Draw arc from top (-π/2) to bottom (π/2) — right half
    canvas.drawArc(rect, -math.pi / 2, math.pi, false, paint);

    // Add severity labels along right side
    final labels = ["Normal", "Mild", "Moderate", "Severe"];
    final angles = [-math.pi / 2, -math.pi / 4, 0, math.pi / 4];
    final textStyle = TextStyle(
      fontSize: 10,
      fontWeight: FontWeight.bold,
      color: Colors.black,
    );

    for (int i = 0; i < labels.length; i++) {
      final angle = angles[i];
      final dx = center.dx + (adjustedRadius + 14) * math.cos(angle);
      final dy = center.dy + (adjustedRadius + 14) * math.sin(angle);

      final textSpan = TextSpan(style: textStyle);

      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      )..layout();

      textPainter.paint(
        canvas,
        Offset(dx - textPainter.width / 2, dy - textPainter.height / 2),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
