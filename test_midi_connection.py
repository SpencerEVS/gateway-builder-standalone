#!/usr/bin/env python3
"""
Test MIDI Connection - Verify rtmidi can connect to devices
"""

import rtmidi
import sys
import time

print("=" * 60)
print("MIDI Connection Test")
print("=" * 60)

# Test 1: Check rtmidi import
print("\n✅ rtmidi imported successfully")
print(f"   rtmidi version: {rtmidi.__version__ if hasattr(rtmidi, '__version__') else 'unknown'}")

# Test 2: Create MidiIn instance
try:
    midiin = rtmidi.MidiIn()
    print("✅ MidiIn() created successfully")
except Exception as e:
    print(f"❌ Failed to create MidiIn(): {e}")
    sys.exit(1)

# Test 3: Get available ports
try:
    ports = midiin.get_ports()
    print(f"✅ get_ports() succeeded")
    print(f"   Found {len(ports)} MIDI device(s):")
    for i, port in enumerate(ports):
        print(f"     [{i}] {port}")
except Exception as e:
    print(f"❌ Failed to get ports: {e}")
    sys.exit(1)

if len(ports) == 0:
    print("\n⚠️  No MIDI devices found")
    sys.exit(0)

# Test 4: Try to open each port
print(f"\n--- Attempting to open each port ---")
success_count = 0

for port_index in range(len(ports)):
    port_name = ports[port_index]
    print(f"\nTesting port {port_index}: {port_name}")
    
    try:
        # Create fresh MidiIn for each test
        test_midi = rtmidi.MidiIn()
        print(f"  Opening port {port_index}...")
        test_midi.open_port(port_index)
        print(f"  ✅ Successfully opened!")
        
        # Test callback
        def test_callback(message, data=None):
            print(f"  📨 Received MIDI: {message}")
        
        test_midi.set_callback(test_callback)
        print(f"  ✅ Callback set")
        
        # Keep port open for a moment
        print(f"  Listening for 2 seconds... (try pressing keys)")
        time.sleep(2)
        
        # Close cleanly
        test_midi.close_port()
        print(f"  ✅ Port closed cleanly")
        success_count += 1
        
    except Exception as e:
        print(f"  ❌ Failed to open port {port_index}: {e}")
        print(f"     Error type: {type(e).__name__}")
        print(f"     Error details: {str(e)}")

print("\n" + "=" * 60)
print(f"Summary: {success_count}/{len(ports)} ports opened successfully")
print("=" * 60)

if success_count == 0:
    print("\n⚠️  Could not open any MIDI ports!")
    print("Possible causes:")
    print("  - Devices in use by another application")
    print("  - Permission issues")
    print("  - Driver conflicts")
else:
    print(f"\n✅ MIDI connection test passed! {success_count} port(s) working")
