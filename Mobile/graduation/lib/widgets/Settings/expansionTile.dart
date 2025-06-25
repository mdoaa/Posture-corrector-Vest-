import 'package:flutter/material.dart';
import 'package:get/get.dart';

class ExpandableTileController extends GetxController {
  final RxBool expanded = false.obs;

  void toggleExpanded() {
    expanded.value = !expanded.value;
  }
}

class ExpandableTile extends StatelessWidget {
  final String title;
  final IconData? icon;
  final List<Widget> children;
  final ExpandableTileController controller = Get.put(
    ExpandableTileController(),
    tag: UniqueKey().toString(),
  );

  ExpandableTile({
    Key? key,
    required this.title,
     this.icon,
    required this.children,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      decoration: BoxDecoration(
        // color: Colors.white,
        color: Theme.of(context).cardColor,

        borderRadius: BorderRadius.circular(12),
      ),
      // padding: const EdgeInsets.all(0.0),
      child: Column(
        children: [
          InkWell(
            onTap: controller.toggleExpanded,
            child: ListTile(
              leading: Icon(icon, color: Colors.blueGrey[500], size: 25),
              title: Text(
                title,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              trailing: Obx(
                () => Icon(
                  // Wrap IconData in Icon widget
                  controller.expanded.value
                      ? Icons.expand_less
                      : Icons.expand_more,
                ),
              ),
            ),
          ),
          Obx(
            () => AnimatedCrossFade(
              firstChild: SizedBox.shrink(),
              secondChild: Column(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: children,
              ),
              crossFadeState:
                  controller.expanded.value
                      ? CrossFadeState.showSecond
                      : CrossFadeState.showFirst,
              duration: Duration(milliseconds: 300),
            ),
          ),
        ],
      ),
    );
  }
}
