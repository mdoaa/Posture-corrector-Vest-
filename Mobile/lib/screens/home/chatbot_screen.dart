import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:sitguard/config.dart';
import 'package:sitguard/controllers/sensors_controller.dart';
import 'package:sitguard/controllers/settings/usercontroller.dart';

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final Sensors sensors = Get.find<Sensors>();
  final UserController userController = Get.find<UserController>();
  final TextEditingController inputController = TextEditingController();
  final ScrollController scrollController = ScrollController();

  final List<_ChatMessage> messages = [
    _ChatMessage(
      sender: _Sender.coach,
      text: 'Hi, I am your posture coach. Ask me about your sitting habits.',
    ),
  ];

  bool isSending = false;
  static const String _serverUnavailableMessage =
      'Server is unavailable right now. Please try again later.';

  @override
  void dispose() {
    inputController.dispose();
    scrollController.dispose();
    super.dispose();
  }

  Future<void> sendMessage([String? presetText]) async {
    final text = (presetText ?? inputController.text).trim();
    if (text.isEmpty || isSending) {
      return;
    }

    setState(() {
      messages.add(_ChatMessage(sender: _Sender.user, text: text));
      isSending = true;
    });

    if (presetText == null) {
      inputController.clear();
    }
    _scrollToBottom();

    final postureState = _derivePostureState();
    final trend = _deriveTrend();
    final slouchDurationSec = (sensors.sCount.value * 30).clamp(0, 7200);
    final correctionsToday = sensors.totalIncorrect.value.clamp(0, 500);

    final List<String> history = messages
        .take(messages.length - 1)
        .map((msg) => msg.text)
        .where((msg) => msg.trim().isNotEmpty)
        .toList();

    final payload = {
      'userId': userController.email.value.isNotEmpty
          ? userController.email.value
          : 'mobile-user',
      'message': text,
      'postureState': postureState,
      'trend': trend,
      'slouchDurationSec': slouchDurationSec,
      'correctionsToday': correctionsToday,
      'discomfortLevel': 0,
      'history': history.length > 12 ? history.sublist(history.length - 12) : history,
    };

    try {
      final response = await http.post(
        Uri.parse('${AppConfig.prodBaseUrl}/api/posture-coach/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final source = (decoded['source'] as String? ?? '').toLowerCase();
        final coach = decoded['coach'];
        final reply = coach is Map<String, dynamic> ? (coach['reply'] as String? ?? '') : '';
        final options = coach is Map<String, dynamic>
            ? ((coach['options'] as List?)
                      ?.map((item) => item?.toString() ?? '')
                      .where((item) => item.trim().isNotEmpty)
                      .toList() ??
                  const <String>[])
            : const <String>[];

        setState(() {
          messages.add(
            _ChatMessage(
              sender: _Sender.coach,
              text: source == 'unavailable'
                  ? _serverUnavailableMessage
                  : (reply.isNotEmpty ? reply : _serverUnavailableMessage),
              options: options,
            ),
          );
        });
      } else {
        setState(() {
          messages.add(
            _ChatMessage(
              sender: _Sender.coach,
              text: _serverUnavailableMessage,
            ),
          );
        });
      }
    } catch (_) {
      setState(() {
        messages.add(
          _ChatMessage(
            sender: _Sender.coach,
            text: _serverUnavailableMessage,
          ),
        );
      });
    } finally {
      setState(() {
        isSending = false;
      });
      _scrollToBottom();
    }
  }

  String _derivePostureState() {
    if (sensors.sCount.value > sensors.normalcount.value) {
      return 'slouching';
    }

    if (sensors.normalcount.value > 0) {
      return 'good';
    }

    return 'unknown';
  }

  String _deriveTrend() {
    if (sensors.sCount.value > sensors.normalcount.value) {
      return 'worsening';
    }

    if (sensors.normalcount.value > sensors.sCount.value) {
      return 'improving';
    }

    return 'stable';
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!scrollController.hasClients) {
        return;
      }

      scrollController.animateTo(
        scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? Colors.blueGrey.shade800 : Colors.blueGrey.shade50,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Ask for quick posture tips, break reminders, or desk setup advice.',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
            ),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  final isUser = msg.sender == _Sender.user;

                  return Align(
                    alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.78,
                      ),
                      decoration: BoxDecoration(
                        color: isUser
                            ? Colors.blueGrey.shade300
                            : (isDark ? Colors.grey.shade800 : Colors.white),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          if (!isDark)
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            msg.text,
                            style: TextStyle(
                              color: isUser ? Colors.white : null,
                              fontSize: 14,
                              height: 1.35,
                            ),
                          ),
                          // Quick options from coach response.
                          if (!isUser && msg.options.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: msg.options.map((option) {
                                return ActionChip(
                                  label: Text(option),
                                  onPressed: isSending ? null : () => sendMessage(option),
                                );
                              }).toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            if (isSending)
              const Padding(
                padding: EdgeInsets.only(bottom: 6),
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: inputController,
                      minLines: 1,
                      maxLines: 3,
                      onSubmitted: (_) => sendMessage(),
                      decoration: InputDecoration(
                        hintText: 'Type your question...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 48,
                    width: 48,
                    child: ElevatedButton(
                      onPressed: isSending ? null : sendMessage,
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: EdgeInsets.zero,
                      ),
                      child: const Icon(Icons.send),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _Sender { user, coach }

class _ChatMessage {
  final _Sender sender;
  final String text;
  final List<String> options;

  _ChatMessage({required this.sender, required this.text, this.options = const []});
}
