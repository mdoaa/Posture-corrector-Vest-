import 'package:get/get.dart';
import 'package:sitguard/models/tips._model.dart';

class TipsController extends GetxController {
  var tipsList = <TipModel>[].obs;

  @override
  void onInit() {
    super.onInit();
    loadTips();
  }

  void loadTips() {
    tipsList.value = [
      TipModel(
        title: 'Best Sitting Posture Tips',
        thumbnailUrl: 'https://img.youtube.com/vi/WCzI3D5hQx8/0.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=WCzI3D5hQx8',
        duration: '3:45',
      ),
      TipModel(
        title: 'Standing Desk Ergonomics',
        thumbnailUrl: 'https://img.youtube.com/vi/j3Igk5nyZE4/0.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=j3Igk5nyZE4',
        duration: '5:20',
      ),
      TipModel(
        title: 'Stretching for Better Posture',
        thumbnailUrl: 'https://img.youtube.com/vi/2pLT-olgUJs/0.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=2pLT-olgUJs',
        duration: '4:10',
      ),
    ];
  }
}
