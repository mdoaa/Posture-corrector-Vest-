import 'package:flutter/material.dart';

class RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? iconColor;
  final double? size;
  final EdgeInsetsGeometry? padding;

  const RoundIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.backgroundColor,
    this.iconColor,
    this.size = 48.0, // Default size
    this.padding = const EdgeInsets.all(8.0), // Default padding
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Material(
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAliasWithSaveLayer,
        color: backgroundColor ?? Theme.of(context).primaryColor,
        child: Column(
          children: [
          
            IconButton(
              icon: Icon(icon, color: iconColor),
              onPressed: onPressed,
              padding: padding!,
              iconSize: size! * 0.6, // Adjust icon size relative to the button size
            ),
            
          ],
        ),
      ),
    );
  }
}
