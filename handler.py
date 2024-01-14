import sys
import time
import board
import busio
import socketio
from rpi_ws281x import PixelStrip, Color
import adafruit_mpr121
import threading

# LED strip configuration:
LED_COUNT = 128          # Number of LED lights on the strip
# LED_COUNT2 = 20          # Number of LED lights on the strip
LED_PIN = 18             # GPIO pin connected to the LED strip pixels (must support PWM)
# LED_PIN2 = 21            # GPIO pin connected to the LED strip pixels (must support PWM)
LED_FREQ_HZ = 800000     # Frequency of the LED signal (should be 800kHz)
LED_DMA = 10             # DMA channel to use for generating signal (try 10)
LED_BRIGHTNESS = 255     # Set to 0 for darkest and 255 for brightest
LED_INVERT = False       # True to invert the signal (when using NPN transistor level shift)
LEDS_PER_RING = 8        # Modify this to match the actual number of LEDs per ring
FADE_STEPS = 10          # Number of steps for fading
DEBOUNCE_TIME = 5  # 200 milliseconds

last_touch_time = [0, 0, 0, 0]  # Initialize last touch time for each sensor

sio = socketio.Client()

# Define colors:
PURPLE = Color(128, 0, 128)
WHITE = Color(255,255,255)

strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS)
# strip2 = PixelStrip(LED_COUNT2, LED_PIN2, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS)
strip.begin()
# strip2.begin()

# Map the logical ring numbers to the actual LED indices (you need to define the order here)
ring_mapping = {
    0: 0,
    1: 8,
    2: 14,
    3: 10,
    4: 6, 
    5: 13,
    6: 11,
    7: 12,
    8: 3, 
    9: 5, 
    10: 15,
    11: 9,
    12: 2,
    13: 1,
    14: 7,
    15: 4,
}

def get_brightness(current_time, cycle_duration, min_brightness, max_brightness):
    """ Calculate the brightness based on the current time within the pulsation cycle. """
    # Find the position in the cycle (0 to 1)
    cycle_position = (current_time % cycle_duration) / cycle_duration

    # Determine if we are in the increasing or decreasing phase of the cycle
    if cycle_position < 0.5:
        # Increasing brightness
        return min_brightness + int(2 * cycle_position * (max_brightness - min_brightness))
    else:
        # Decreasing brightness
        return max_brightness - int(2 * (cycle_position - 0.5) * (max_brightness - min_brightness))

def convert_color_name_to_color(color_name):
    # Define a dictionary mapping color names to their corresponding Color objects
    color_map = {
        "WHITE": Color(255,255,255),
        "PURPLE": Color(128, 0, 128)
        # Add more colors as needed
    }

    DEFAULT_COLOR = Color(255,255,255)  # Example: Black

    # Get the color from the map, defaulting to a fallback color if the name is not found
    return color_map.get(color_name, DEFAULT_COLOR)  # Replace DEFAULT_COLOR with

def connect():
    print("Connected to Socket.IO server")

def disconnect():
    print("Disconnected from Socket.IO server")

sio.connect('http://localhost:3000')  # Replace with your server's URL

# def cycle_rgb_on_strip2():
#     """ Cycles through Red, Green, and Blue colors on all LEDs of strip2. """
#     colors = [Color(255, 0, 0), Color(0, 255, 0), Color(0, 0, 255)]  # Red, Green, Blue

#     for color in colors:
#         for i in range(LED_COUNT2):
#             strip2.setPixelColor(i, color)
#         strip2.show()
#         time.sleep(1)  # Wait for 1 second before changing to the next color

# def purple_pulsation(strip, duration=5, max_brightness=255, min_brightness=0, steps=50):
#     """ Creates a pulsating purple effect on the specified LED strip.
    
#     :param strip: The LED strip object.
#     :param duration: Total duration of the effect in seconds.
#     :param max_brightness: Maximum brightness level (0-255).
#     :param min_brightness: Minimum brightness level (0-255).
#     :param steps: Number of steps in the pulsation cycle.
#     """
#     purple = Color(128, 0, 128)  # Purple color
#     step_duration = duration / (2 * steps)  # Time for each brightness step

#     for _ in range(steps):
#         # Gradually increase brightness
#         for brightness in range(min_brightness, max_brightness, int((max_brightness - min_brightness) / steps)):
#             adjusted_color = Color(brightness // 2, 0, brightness // 2)  # Adjust the purple color brightness
#             for i in range(LED_COUNT2):
#                 strip.setPixelColor(i, adjusted_color)
#             strip.show()
#             time.sleep(step_duration)

#         # Gradually decrease brightness
#         for brightness in range(max_brightness, min_brightness, -int((max_brightness - min_brightness) / steps)):
#             adjusted_color = Color(brightness // 2, 0, brightness // 2)  # Adjust the purple color brightness
#             for i in range(LED_COUNT2):
#                 strip.setPixelColor(i, adjusted_color)
#             strip.show()
#             time.sleep(step_duration)

@sio.on('turnOnLed')
def handle_turn_on_led(data):
    ring_number = data['ring_number']
    color = convert_color_name_to_color(data['color'])

    turnOnLed(strip, ring_number, color)

def turnOnLed(strip, ring_number, color):
    start_index = ring_mapping[ring_number] * LEDS_PER_RING
    for i in range(start_index, start_index + LEDS_PER_RING):
        strip.setPixelColor(i, color)
    strip.show()

@sio.on('turnOffLed')
def handle_turnOffLed(data):
    turn_off_all_leds(strip, data)

def turnOffLed(strip, ring_number):
    start_index = ring_mapping[ring_number] * LEDS_PER_RING
    for i in range(start_index, start_index + LEDS_PER_RING):
        strip.setPixelColor(i, Color(0, 0, 0))
    strip.show()

@sio.on('turn_off_all_leds')
def handle_turn_off_all_leds():
    turn_off_all_leds(strip)

def turn_off_all_leds(strip):
    for i in range(strip.numPixels()):
        strip.setPixelColor(i, Color(0, 0, 0))
    strip.show()

@sio.on('choose_participant')
def handle_choose_participant(data):
    number_of_final_led = data['number_of_final_led']
    choose_participant(strip, number_of_final_led)

def choose_participant(strip, number_of_final_led):
    # Variables for total time and number of LEDs
    total_time = 6  # Total time in seconds, adjust as needed
    number_of_leds = 48  # Total number of LEDs to cycle through, adjust as needed

    # Ensure the provided LED number is within the valid range
    if number_of_final_led < 0 or number_of_final_led >= len(ring_mapping):
        raise ValueError("Invalid LED number. Must be within the range of available rings.")

    # Calculate time each LED should be on
    time_per_led = total_time / number_of_leds

    current_ring = number_of_final_led

    for x in range(number_of_leds+1):
        # Turn on the current ring
        turnOnLed(strip, current_ring, PURPLE)
        time.sleep(time_per_led)  # Time the ring stays on
        
        # Turn off the current ring before moving to the next
        turnOnLed(strip, current_ring, Color(0, 0, 0))

        # Move to the next ring, wrap around if necessary
        current_ring = (current_ring + 1) % len(ring_mapping)

    # When the loop breaks, leave the final ring on
    turnOnLed(strip, (number_of_final_led - 1) % len(ring_mapping), PURPLE)
    turnOnLed(strip, number_of_final_led, PURPLE)
    turnOnLed(strip, (number_of_final_led + 1) % len(ring_mapping), PURPLE)

# Initialize MPR121 for the touch sensor
i2c = busio.I2C(board.SCL, board.SDA)
mpr121 = adafruit_mpr121.MPR121(i2c)

last_state = [False] * 4

for i in range(4):
    mpr121[i].threshold = 5
    mpr121[i].release_threshold = 5

try:
    while True:
        # purple_pulsation(strip2)

        # cycle_rgb_on_strip2()

        # cycle_duration=2
        # min_brightness=0
        # max_brightness=255
        
        # current_time = time.time()
        # brightness = get_brightness(current_time, cycle_duration, min_brightness, max_brightness)
        # adjusted_color = Color(brightness // 2, 0, brightness // 2)  # Adjust the purple color brightness

        # for i in range(LED_COUNT2):
        #     strip2.setPixelColor(i, adjusted_color)
        # strip2.show()

        for i in range(4):
            current_state = mpr121[i].value
            current_time = time.time()
   

            if current_state and not last_state[i]:
                sio.emit('touch_event', {'sensor_id': i, 'state': 'touched'})  # Emit touch event to server
                
                if i == 0:
                    turnOnLed(strip, 0, WHITE)
                    turnOnLed(strip, 1, WHITE)
                    turnOnLed(strip, 2, WHITE)
                elif i == 1:
                    turnOnLed(strip, 4, WHITE)
                    turnOnLed(strip, 5, WHITE)
                    turnOnLed(strip, 6, WHITE)
                elif i == 2:
                    turnOnLed(strip, 12, WHITE)
                    turnOnLed(strip, 13, WHITE)
                    turnOnLed(strip, 14, WHITE)
                elif i == 3:
                    turnOnLed(strip, 8, WHITE)
                    turnOnLed(strip, 9, WHITE)
                    turnOnLed(strip, 10, WHITE)

            elif not current_state and last_state[i]:
                # print(f"Untouched: {i}")
                sio.emit('touch_event', {'sensor_id': i, 'state': 'untouched'})  # Emit untouched event to server
                
                if i == 0:
                    turnOffLed(strip, 0)
                    turnOffLed(strip, 1)
                    turnOffLed(strip, 2)
                elif i == 1:
                    turnOffLed(strip, 4)
                    turnOffLed(strip, 5)
                    turnOffLed(strip, 6)
                elif i == 2:
                    turnOffLed(strip, 12)
                    turnOffLed(strip, 13)
                    turnOffLed(strip, 14)
                elif i == 3:
                    turnOffLed(strip, 8)
                    turnOffLed(strip, 9)
                    turnOffLed(strip, 10)

            last_state[i] = current_state

        time.sleep(0.1)
        mpr121.reset

except KeyboardInterrupt:
    print("Keyboard Interrupt, exited")  # Debug comment
    sio.disconnect()  # Disconnect from Socket.IO server
    turn_off_all_leds(strip)
    turn_off_all_leds(strip2)