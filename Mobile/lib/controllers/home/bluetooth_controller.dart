import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:get/get.dart';
import 'package:permission_handler/permission_handler.dart';

class BluetoothController extends GetxController {
  // These UUIDs must match the ESP32 firmware exactly.
  static const String _serviceUuid = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  static const String _characteristicUuid =
      "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  final RxBool isBusy = false.obs;
  final RxString statusMessage = "".obs;
  final RxBool passwordVisible = false.obs;

  final TextEditingController ssidController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  void togglePasswordVisibility() {
    passwordVisible.value = !passwordVisible.value;
  }

  Future<void> sendWifiCredentials() async {
    if (isBusy.value) return;

    final ssid = ssidController.text.trim();
    final password = passwordController.text;

    if (ssid.isEmpty) {
      statusMessage.value = "Please enter a WiFi name";
      return;
    }

    isBusy.value = true;
    statusMessage.value = "";

    try {
      await _scanConnectAndSend(ssid, password);
    } finally {
      isBusy.value = false;
    }
  }

  Future<void> _scanConnectAndSend(String ssid, String password) async {
    // Request runtime permissions used by BLE scanning/connecting.
    final statuses =
        await <Permission>[
          Permission.bluetoothScan,
          Permission.bluetoothConnect,
          Permission.locationWhenInUse,
        ].request();

    final denied = statuses.values.any(
      (s) => s.isDenied || s.isPermanentlyDenied || s.isRestricted,
    );
    if (denied) {
      statusMessage.value = "Bluetooth permission denied";
      return;
    }

    // Check adapter state
    final adapterState = await FlutterBluePlus.adapterState.first;
    if (adapterState != BluetoothAdapterState.on) {
      statusMessage.value = "Please enable Bluetooth";
      return;
    }

    final device = await _findEspDevice();

    if (device == null) {
      statusMessage.value =
          "ESP32 not found. Power on ESP and wait 10-20 sec, then try again.";
      return;
    }

    statusMessage.value = "Connecting...";
    try {
      await device.connect(timeout: const Duration(seconds: 10));
    } catch (e) {
      statusMessage.value = "Connection failed: ${e.toString()}";
      return;
    }

    try {
      statusMessage.value = "Discovering services...";
      final services = await device.discoverServices();

      BluetoothCharacteristic? characteristic;
      for (final service in services) {
        if (service.uuid.toString().toLowerCase() == _serviceUuid) {
          for (final c in service.characteristics) {
            if (c.uuid.toString().toLowerCase() == _characteristicUuid) {
              characteristic = c;
              break;
            }
          }
        }
      }

      if (characteristic == null) {
        statusMessage.value = "WiFi service not found on device";
        return;
      }

      final payload = "WIFI:$ssid:$password";
      await characteristic.write(utf8.encode(payload), withoutResponse: false);
      statusMessage.value = "WiFi credentials sent successfully!";
    } finally {
      try {
        await device.disconnect();
      } catch (_) {}
    }
  }

  bool _matchesTargetDevice(ScanResult result) {
    final platformName = result.device.platformName.toLowerCase();
    final advName = result.advertisementData.advName.toLowerCase();

    final hasExpectedName =
        platformName.contains("sitguard") ||
        platformName.contains("esp32") ||
        advName.contains("sitguard") ||
        advName.contains("esp32");

    final hasExpectedService = result.advertisementData.serviceUuids.any(
      (u) => u.toString().toLowerCase().contains(_serviceUuid),
    );

    return hasExpectedName || hasExpectedService;
  }

  Future<BluetoothDevice?> _findEspDevice() async {
    for (int attempt = 1; attempt <= 2; attempt++) {
      statusMessage.value = "Scanning for ESP32... ($attempt/2)";

      try {
        await FlutterBluePlus.stopScan();
      } catch (_) {}

      final completer = Completer<BluetoothDevice?>();
      final sub = FlutterBluePlus.scanResults.listen((results) {
        for (final result in results) {
          if (_matchesTargetDevice(result)) {
            if (!completer.isCompleted) {
              FlutterBluePlus.stopScan();
              completer.complete(result.device);
            }
            return;
          }
        }
      });

      await FlutterBluePlus.startScan(timeout: const Duration(seconds: 12));
      if (!completer.isCompleted) completer.complete(null);

      await sub.cancel();
      final found = await completer.future;
      if (found != null) return found;
      await Future.delayed(const Duration(milliseconds: 350));
    }

    return null;
  }

  @override
  void onClose() {
    ssidController.dispose();
    passwordController.dispose();
    super.onClose();
  }
}
