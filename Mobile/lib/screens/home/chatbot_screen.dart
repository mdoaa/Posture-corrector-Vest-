import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:http/http.dart' as http;
import 'package:sitguard/config.dart';
import 'package:sitguard/controllers/home/homescreen.dart';
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
  final GetStorage _box = GetStorage();
  final HomeController? homeController =
      Get.isRegistered<HomeController>() ? Get.find<HomeController>() : null;
  final TextEditingController inputController = TextEditingController();
  final ScrollController scrollController = ScrollController();

  final List<_ChatThread> _threads = [];
  String? _activeThreadId;

  bool isSending = false;
  static const String _serverUnavailableMessage =
      'Server is unavailable right now. Please try again later.';

  static const String _welcomeMessage =
      'Hi, I am your posture coach. Ask me about your sitting habits.';

  _ChatThread? get _activeThread {
    if (_threads.isEmpty) return null;
    final idx = _threads.indexWhere((thread) => thread.id == _activeThreadId);
    if (idx < 0) return _threads.first;
    return _threads[idx];
  }

  String get _storageKey {
    final rawEmail = userController.email.value.trim().toLowerCase();
    if (rawEmail.isEmpty) return 'chat_threads_mobile_user';
    final safe = rawEmail.replaceAll(RegExp(r'[^a-z0-9@._-]'), '_');
    return 'chat_threads_$safe';
  }

  String get _storageActiveKey => '${_storageKey}_active';

  @override
  void initState() {
    super.initState();
    _loadThreads();
  }

  @override
  void dispose() {
    inputController.dispose();
    scrollController.dispose();
    super.dispose();
  }

  _ChatThread _createThreadWithWelcome() {
    final now = DateTime.now();
    final message = _ChatMessage(
      sender: _Sender.coach,
      text: _welcomeMessage,
      createdAt: now,
    );

    return _ChatThread(
      id: now.microsecondsSinceEpoch.toString(),
      title: 'New chat',
      updatedAt: now,
      messages: [message],
    );
  }

  void _loadThreads() {
    final dynamic rawThreads = _box.read(_storageKey);
    final dynamic rawActive = _box.read(_storageActiveKey);

    if (rawThreads is List) {
      final loaded =
          rawThreads
              .whereType<Map>()
              .map(
                (item) => _ChatThread.fromJson(Map<String, dynamic>.from(item)),
              )
              .where((item) => item.messages.isNotEmpty)
              .toList();

      _threads
        ..clear()
        ..addAll(loaded);
    }

    if (_threads.isEmpty) {
      final starter = _createThreadWithWelcome();
      _threads.add(starter);
      _activeThreadId = starter.id;
      _persistThreads();
      return;
    }

    if (rawActive is String &&
        _threads.any((thread) => thread.id == rawActive)) {
      _activeThreadId = rawActive;
    } else {
      _threads.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      _activeThreadId = _threads.first.id;
    }
  }

  void _persistThreads() {
    _box.write(_storageKey, _threads.map((thread) => thread.toJson()).toList());
    _box.write(_storageActiveKey, _activeThreadId);
  }

  void _createNewChat() {
    setState(() {
      final thread = _createThreadWithWelcome();
      _threads.insert(0, thread);
      _activeThreadId = thread.id;
      inputController.clear();
      _persistThreads();
    });
    _scrollToBottom();
  }

  void _switchToThread(String threadId) {
    if (_activeThreadId == threadId) return;
    setState(() {
      _activeThreadId = threadId;
      _persistThreads();
    });
    _scrollToBottom();
  }

  void _deleteThread(String threadId) {
    setState(() {
      _threads.removeWhere((thread) => thread.id == threadId);
      if (_threads.isEmpty) {
        final starter = _createThreadWithWelcome();
        _threads.add(starter);
        _activeThreadId = starter.id;
      } else if (!_threads.any((thread) => thread.id == _activeThreadId)) {
        _threads.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
        _activeThreadId = _threads.first.id;
      }
      _persistThreads();
    });
    _scrollToBottom();
  }

  void _updateThreadTitle(_ChatThread thread, String firstUserText) {
    if (thread.title != 'New chat') return;
    final compact = firstUserText.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (compact.isEmpty) return;
    thread.title =
        compact.length > 40 ? '${compact.substring(0, 40)}...' : compact;
  }

  void _touchThread(_ChatThread thread) {
    thread.updatedAt = DateTime.now();
    _threads.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    _activeThreadId = thread.id;
  }

  String _timeLabel(DateTime value) {
    final hour =
        value.hour > 12 ? value.hour - 12 : (value.hour == 0 ? 12 : value.hour);
    final minute = value.minute.toString().padLeft(2, '0');
    final suffix = value.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $suffix';
  }

  Future<void> sendMessage([String? presetText]) async {
    final thread = _activeThread;
    if (thread == null) return;

    final text = (presetText ?? inputController.text).trim();
    if (text.isEmpty || isSending) {
      return;
    }

    setState(() {
      thread.messages.add(
        _ChatMessage(
          sender: _Sender.user,
          text: text,
          createdAt: DateTime.now(),
        ),
      );
      _updateThreadTitle(thread, text);
      _touchThread(thread);
      _persistThreads();
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
    final mpuAngle = (homeController?.slouchySeverity.value ?? 0.0).clamp(
      -90.0,
      90.0,
    );
    final fsrPressure = (homeController?.rightAndLeftSeverity.value ?? 0.0)
        .clamp(0.0, 1024.0);
    final vibrationActive = homeController?.vibrationActive.value ?? false;
    final airChamberActive = homeController?.airChamberActive.value ?? false;

    final List<String> history =
        thread.messages
            .take(thread.messages.length - 1)
            .map((msg) => '${msg.sender.name}: ${msg.text}')
            .where((msg) => msg.trim().isNotEmpty)
            .toList();

    final payload = {
      'userId':
          userController.email.value.isNotEmpty
              ? userController.email.value
              : 'mobile-user',
      'message': text,
      'postureState': postureState,
      'trend': trend,
      'slouchDurationSec': slouchDurationSec,
      'correctionsToday': correctionsToday,
      'mpuAngle': mpuAngle,
      'fsrPressure': fsrPressure,
      'vibrationActive': vibrationActive,
      'airChamberActive': airChamberActive,
      'debugModelPayload': false,
      'history':
          history.length > 12 ? history.sublist(history.length - 12) : history,
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
        final reply =
            coach is Map<String, dynamic>
                ? (coach['reply'] as String? ?? '')
                : '';
        final options =
            coach is Map<String, dynamic>
                ? ((coach['options'] as List?)
                        ?.map((item) => item?.toString() ?? '')
                        .where((item) => item.trim().isNotEmpty)
                        .toList() ??
                    const <String>[])
                : const <String>[];

        setState(() {
          thread.messages.add(
            _ChatMessage(
              sender: _Sender.coach,
              text:
                  source == 'unavailable'
                      ? _serverUnavailableMessage
                      : (reply.isNotEmpty ? reply : _serverUnavailableMessage),
              createdAt: DateTime.now(),
              options: options,
            ),
          );
          _touchThread(thread);
          _persistThreads();
        });
      } else {
        setState(() {
          thread.messages.add(
            _ChatMessage(
              sender: _Sender.coach,
              text: _serverUnavailableMessage,
              createdAt: DateTime.now(),
            ),
          );
          _touchThread(thread);
          _persistThreads();
        });
      }
    } catch (_) {
      setState(() {
        thread.messages.add(
          _ChatMessage(
            sender: _Sender.coach,
            text: _serverUnavailableMessage,
            createdAt: DateTime.now(),
          ),
        );
        _touchThread(thread);
        _persistThreads();
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
    final activeThread = _activeThread;
    final messages = activeThread?.messages ?? const <_ChatMessage>[];

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color:
                    isDark
                        ? Colors.blueGrey.shade900
                        : Colors.blueGrey.shade100,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(Icons.chat_bubble_outline),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      activeThread?.title ?? 'Posture Coach',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'All chats',
                    onPressed: _openChatThreadsSheet,
                    icon: const Icon(Icons.history),
                  ),
                  TextButton.icon(
                    onPressed: _createNewChat,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                    ),
                    icon: const Icon(Icons.add_comment_outlined, size: 18),
                    label: const Text('New Chat'),
                  ),
                ],
              ),
            ),
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color:
                    isDark ? Colors.blueGrey.shade800 : Colors.blueGrey.shade50,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Ask for posture tips, break planning, desk ergonomics, or recovery routines.',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
            Expanded(
              child: ListView.separated(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                itemCount: messages.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  final isUser = msg.sender == _Sender.user;

                  return Align(
                    alignment:
                        isUser ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.8,
                      ),
                      decoration: BoxDecoration(
                        gradient:
                            isUser
                                ? const LinearGradient(
                                  colors: [
                                    Color(0xFF607D8B),
                                    Color(0xFF455A64),
                                  ],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                )
                                : null,
                        color:
                            isUser
                                ? null
                                : (isDark
                                    ? const Color(0xFF1F2A33)
                                    : const Color(0xFFEAF1F5)),
                        borderRadius: BorderRadius.circular(14),
                        border:
                            isUser
                                ? null
                                : Border.all(
                                  color:
                                      isDark
                                          ? Colors.blueGrey.withOpacity(0.35)
                                          : Colors.blueGrey.withOpacity(0.22),
                                ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            msg.text,
                            style: TextStyle(
                              color: isUser ? Colors.white : null,
                              fontSize: 14,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _timeLabel(msg.createdAt),
                            style: TextStyle(
                              fontSize: 11,
                              color:
                                  isUser
                                      ? Colors.white.withOpacity(0.8)
                                      : Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.color
                                          ?.withOpacity(0.7),
                            ),
                          ),
                          if (!isUser && msg.options.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children:
                                  msg.options.map((option) {
                                    return ActionChip(
                                      label: Text(option),
                                      onPressed:
                                          isSending
                                              ? null
                                              : () => sendMessage(option),
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
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Theme.of(context).colorScheme.secondary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text('Coach is thinking...'),
                  ],
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
                      textInputAction: TextInputAction.send,
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

  Future<void> _openChatThreadsSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        final sorted = [..._threads]
          ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Chats',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () {
                        Navigator.of(context).pop();
                        _createNewChat();
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('New'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: sorted.length,
                    itemBuilder: (context, index) {
                      final thread = sorted[index];
                      final selected = thread.id == _activeThreadId;
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 6,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        selected: selected,
                        selectedTileColor: Theme.of(
                          context,
                        ).colorScheme.secondary.withOpacity(0.15),
                        title: Text(
                          thread.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          'Updated ${_timeLabel(thread.updatedAt)}',
                        ),
                        onTap: () {
                          Navigator.of(context).pop();
                          _switchToThread(thread.id);
                        },
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () {
                            _deleteThread(thread.id);
                            if (sorted.length == 1) {
                              Navigator.of(context).pop();
                            }
                            setState(() {});
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

enum _Sender { user, coach }

class _ChatMessage {
  final _Sender sender;
  final String text;
  final List<String> options;
  final DateTime createdAt;

  _ChatMessage({
    required this.sender,
    required this.text,
    required this.createdAt,
    this.options = const [],
  });

  Map<String, dynamic> toJson() {
    return {
      'sender': sender.name,
      'text': text,
      'options': options,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory _ChatMessage.fromJson(Map<String, dynamic> json) {
    final senderRaw = (json['sender'] ?? '').toString();
    final sender =
        senderRaw == _Sender.user.name ? _Sender.user : _Sender.coach;
    final options =
        ((json['options'] as List?) ?? const <dynamic>[])
            .map((item) => item.toString())
            .where((item) => item.trim().isNotEmpty)
            .toList();

    return _ChatMessage(
      sender: sender,
      text: (json['text'] ?? '').toString(),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
      options: options,
    );
  }
}

class _ChatThread {
  final String id;
  String title;
  DateTime updatedAt;
  final List<_ChatMessage> messages;

  _ChatThread({
    required this.id,
    required this.title,
    required this.updatedAt,
    required this.messages,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'updatedAt': updatedAt.toIso8601String(),
      'messages': messages.map((message) => message.toJson()).toList(),
    };
  }

  factory _ChatThread.fromJson(Map<String, dynamic> json) {
    final rawMessages = (json['messages'] as List?) ?? const <dynamic>[];
    return _ChatThread(
      id:
          (json['id'] ?? DateTime.now().microsecondsSinceEpoch.toString())
              .toString(),
      title: (json['title'] ?? 'New chat').toString(),
      updatedAt:
          DateTime.tryParse((json['updatedAt'] ?? '').toString()) ??
          DateTime.now(),
      messages:
          rawMessages
              .whereType<Map>()
              .map(
                (item) =>
                    _ChatMessage.fromJson(Map<String, dynamic>.from(item)),
              )
              .toList(),
    );
  }
}
