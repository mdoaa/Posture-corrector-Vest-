import 'package:flutter/material.dart';

// // Widget insightCard(
// //   String title,
// //   int value,
// //   String status,
// //   Color color,
// //   Color background,
// //   IconData icon
// // ) {
// //   return LayoutBuilder(
// //     builder: (context, constraints) {
// //       return SizedBox(
// //         child: Card(
// //           shape: RoundedRectangleBorder(
// //             borderRadius: BorderRadius.circular(16),
// //           ),
// //           elevation: 3,
// //           color: background,
// //           child: Padding(
// //             padding: const EdgeInsets.all(5.0),
// //             child: Column(
// //               children: [
// //                 Icon(icon, size: 32, color: color),
// //                     const SizedBox(height: 4),
// //                        Text(
// //                   title,
// //                   style: TextStyle(fontWeight: FontWeight.w900),
// //                   textAlign: TextAlign.center,
// //                 ),
// //                 Text(
// //                   "$value",
// //                   style: TextStyle(
// //                     fontSize: 24,
// //                     color: color,
// //                     fontWeight: FontWeight.bold,
// //                   ),
// //                 ),
// //                 const SizedBox(height: 4),

// //                 // Text(status, style: TextStyle(color: color)),
// //               ],
// //             ),
// //           ),
// //         ),
// //       );
// //     },
// //   );
// // }

// Widget insightCard(
//   String title,
//   int value,
//   String status,
//   Color color,
//   Color background,
//   IconData icon,
// ) {
//   return Card(
//     shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
//     elevation: 3,
//     color: background,
//     child: Padding(
//       padding: const EdgeInsets.all(
//         12.0,
//       ), // Increased padding for better spacing
//       child: Column(
//         mainAxisSize: MainAxisSize.min, // Make Column take only necessary space
//         children: [
//           Icon(icon, size: 32, color: color),
//           const SizedBox(height: 8), // Increased spacing
//           Text(
//             title,
//             style: const TextStyle(fontWeight: FontWeight.w900),
//             textAlign: TextAlign.center,
//             maxLines: 2, // Prevent very long titles from overflowing
//             overflow: TextOverflow.ellipsis,
//           ),
//           const SizedBox(height: 4),
//           Text(
//             "$value",
//             style: TextStyle(
//               fontSize: 20, // Slightly reduced font size
//               color: color,
//               fontWeight: FontWeight.bold,
//             ),
//           ),
//           const SizedBox(height: 8), // Increased spacing
//           // Text(status, style: TextStyle(color: color)),
//         ],
//       ),
//     ),
//   );
// }
Widget insightCard(
  String title,
  int value,
  String status,
  Color color,
  Color background,
  IconData icon,
) {
  return Card(
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    elevation: 3,
    color: background,
    child: Padding(
      padding: const EdgeInsets.all(10.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 32, color: color),
          const SizedBox(height: 5),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w900),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            "$value",
            style: TextStyle(
              fontSize: 24,
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    ),
  );
}
