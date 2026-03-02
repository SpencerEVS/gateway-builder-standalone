import rtmidi
import time
import sys
import asyncio
import socket
from collections import OrderedDict
from pymodbus.server import StartAsyncTcpServer
from pymodbus.datastore import (
    ModbusServerContext,
    ModbusSlaveContext,
    ModbusSequentialDataBlock,
)



#ordered dicts for bit mapping
pad_state = OrderedDict({
    "D1_P1": False,         #b0
    "D1_P2": False,         #b1
    "D1_P3": False,         #b2
    "D1_P4": False,         #b3
    "D1_P5": False,         #b4
    "D1_P6": False,         #b5
    "D1_P7": False,         #b6
    "D1_P8": False,         #b7
    "D2_P1": False,         #b8
    "D2_P2": False,         #b9
    "D2_P3": False,         #b10
    "D2_P4": False,         #b11
    "D2_P5": False,         #b12
    "D2_P6": False,         #b13
    "D2_P7": False,         #b14
    "D2_P8": False,         #b15
})

button_state = OrderedDict({
    "D1_Shift": False,
    "D1_Cue": False,
    "D1_Play/Pause": False,
    "D1_BeatSync": False,
    "D2_Shift": False,
    "D2_Cue": False,
    "D2_Play/Pause": False,
    "D2_BeatSync": False,
    "Headphones1": False,
    "Headphones2": False,
    "Master": False,
    "SmartFader": False,
})

wheel_state = OrderedDict({
    "D1_Wheel_CCW": False,  # bit 0
    "D1_Wheel_CW": False,   # bit 1
    "D2_Wheel_CCW": False,  # bit 2
    "D2_Wheel_CW": False,   # bit 3
})

analog_state = OrderedDict({
    "D1_HI": 0,
    "D1_MID": 0,
    "D1_LOW": 0,
    "D1_CFX": 0,
    "D2_HI": 0,
    "D2_MID": 0,
    "D2_LOW": 0,
    "D2_CFX": 0,
    
    "D1_TEMPO": 0,
    "D2_TEMPO": 0,
    "D1_LEVEL": 0,
    "D2_LEVEL": 0,
    "FADER": 0,
})

#last active dicts for delay ons
pad_last_active = {}
for key in pad_state:
    pad_last_active[key] = 0

wheel_last_active = {}
for key in wheel_state:
    wheel_last_active[key] = 0

button_last_active = {}
for key in button_state:
    button_last_active[key] = 0

# modbus initialization
store = ModbusSlaveContext(
    di=ModbusSequentialDataBlock(0, [0]*100),
    co=ModbusSequentialDataBlock(0, [0]*100),
    hr=ModbusSequentialDataBlock(0, [0]*100),
    ir=ModbusSequentialDataBlock(0, [0]*100),
)
context = ModbusServerContext(slaves=store, single=True)


def midi_func(midi_event, data=None):
    
    # Map MIDI events to state changes
    event_map = {
    #deck 1 pads
        (151, 0, 127): (pad_state, "D1_P1", True),
        (151, 1, 127): (pad_state, "D1_P2", True),
        (151, 2, 127): (pad_state, "D1_P3", True),
        (151, 3, 127): (pad_state, "D1_P4", True),
        (151, 4, 127): (pad_state, "D1_P5", True),
        (151, 5, 127): (pad_state, "D1_P6", True),
        (151, 6, 127): (pad_state, "D1_P7", True),
        (151, 7, 127): (pad_state, "D1_P8", True),
    #deck 2 pads
        (153, 0, 127): (pad_state, "D2_P1", True),
        (153, 1, 127): (pad_state, "D2_P2", True),
        (153, 2, 127): (pad_state, "D2_P3", True),
        (153, 3, 127): (pad_state, "D2_P4", True),
        (153, 4, 127): (pad_state, "D2_P5", True),
        (153, 5, 127): (pad_state, "D2_P6", True),
        (153, 6, 127): (pad_state, "D2_P7", True),
        (153, 7, 127): (pad_state, "D2_P8", True),
    #wheels
        (176, 34, 63): (wheel_state, "D1_Wheel_CCW", True),
        (176, 34, 65): (wheel_state, "D1_Wheel_CW", True),
        (177, 34, 63): (wheel_state, "D2_Wheel_CCW", True),
        (177, 34, 65): (wheel_state, "D2_Wheel_CW", True),
    #buttons
        (144, 63, 127): (button_state, "D1_Shift", True),
        (144, 12, 127): (button_state, "D1_Cue", True),
        (144, 11, 127): (button_state, "D1_Play/Pause", True),
        (144, 92, 127): (button_state, "D1_BeatSync", True),
        (145, 63, 127): (button_state, "D2_Shift", True),
        (145, 12, 127): (button_state, "D2_Cue", True),
        (145, 11, 127): (button_state, "D2_Play/Pause", True),
        (145, 92, 127): (button_state, "D2_BeatSync", True),
        (144, 84, 127): (button_state, "Headphones1", True),
        (145, 84, 127): (button_state, "Headphones2", True),
        (150, 99, 127): (button_state, "Master", True),
        (150, 1, 127): (button_state, "SmartFader", True),
    }

    analog_map = {
        (176, 7): ("D1_HI"),
        (176, 11): ("D1_MID"),
        (176, 15): ("D1_LOW"),
        (182, 23): ("D1_CFX"),
        (177, 7): ("D2_HI"),
        (177, 11): ("D2_MID"),
        (177, 15): ("D2_LOW"),
        (182, 24): ("D2_CFX"),
        
        (176, 19): ("D1_LEVEL"),
        (177, 19): ("D2_LEVEL"),
        (176, 0): ("D1_TEMPO"),
        (177, 0): ("D2_TEMPO"),
        (182, 31): ("FADER"),
    }

    midi_message = midi_event[0]
    msg3 = midi_message[0], midi_message[1], midi_message[2]
    msg2 = midi_message[0], midi_message[1]
    print(f"MIDI message: {msg3}")     

    
    #checks against 3 bit events (buttons/pads). Sets them TRUE, they are reset later. If they are wheel or pad, set last active time
    if msg3 in event_map:
        target_dict, key, value = event_map[msg3]
        target_dict[key] = True
        if target_dict is wheel_state and value:
            wheel_last_active[key] = time.time()
        if target_dict is pad_state and value:
            pad_last_active[key] = time.time()
        if target_dict is button_state and value:
            button_last_active[key] = time.time()
    #checks agaisnt 2 bit events (sliders and knobs). Sets them to 3rd bit value
    elif msg2 in analog_map:
        key = analog_map[msg2]
        analog_state[key] = midi_message[2]

    
def setup_midi():
    try:
        midiin = rtmidi.MidiIn()
        ports = midiin.get_ports()
        if len(ports) == 0:
            print("No MIDI devices found.")
            sys.exit()
        print(f"Using MIDI input: {ports[0]}")
        midiin.open_port(0)
        midiin.set_callback(midi_func)
    except:
        print("Midi Setup Error")
        sys.exit()

#Update Modbus registers
async def update_reg_loop():
    while True:
        try:
            now = time.time()
            WHEEL_HOLD_TIME = 0.4
            PAD_HOLD_TIME = 0.4
            

            # Convert bools to bits and append to lists
            pad_bits_list = []
            for val in pad_state.values():
                pad_bits_list.append(int(val))
            
            wheel_bits_list = []
            for val in wheel_state.values():
                wheel_bits_list.append(int(val))

            #take above lists and bit shift into integer
            pad_bits_int = 0
            for i in range(len(pad_bits_list)):
                pad_bits_int = pad_bits_int | (pad_bits_list[i] << i)
            
            wheel_bits_int = 0
            for i in range(len(wheel_bits_list)):
                wheel_bits_int = wheel_bits_int | (wheel_bits_list[i] << i)
            
            analog_values = list(analog_state.values())

            #3 for holding reg write, 2nd num = register num
            context[0].setValues(3, 0, [pad_bits_int])  #reg 1
            context[0].setValues(3, 1, [wheel_bits_int])  # reg 2
            context[0].setValues(3, 2, analog_values)  #reg 3+
            
            #reset wheel states
            for key in wheel_state:
                if wheel_state[key] and (now - wheel_last_active[key] > WHEEL_HOLD_TIME):
                    wheel_state[key] = False
            #reset pad states
            for key in pad_state:
                if pad_state[key] and (now - pad_last_active[key] > PAD_HOLD_TIME):
                    pad_state[key] = False
            #reset button states
            for key in button_state:
                if button_state[key] and (now - button_last_active[key] > PAD_HOLD_TIME):
                    button_state[key] = False

            await asyncio.sleep(0.3)        #modbus sleep time
        except asyncio.CancelledError:
            print("Modbus Error")
            return
            

async def main():
    setup_midi()
    
    task_1 = StartAsyncTcpServer(context, address=("0.0.0.0", 523), identity=1)
    task_2 = asyncio.create_task(update_reg_loop())
     
    ip = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    ip.connect(("8.8.8.8", 80))
    print("Modbus Server at port" , ip.getsockname()[0], "port 523")
    ip.close()
    try:
        await asyncio.gather(task_1, task_2)
    except KeyboardInterrupt:
        print("Exiting...")
        task_2.cancel()
        try:
            await task_2
        except asyncio.CancelledError:
            print("AsyncIO func stopped")

# run it
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("shutting down...")