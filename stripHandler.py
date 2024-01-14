import time
from rpi_ws281x import PixelStrip, Color

# LED strip configuration:
LED_COUNT = 60          # Number of LED lights on the strip (adjust as needed)
LED_PIN = 21            # GPIO pin connected to the LED strip pixels (must support PWM)
LED_FREQ_HZ = 800000    # Frequency of the LED signal (should be 800kHz)
LED_DMA = 10            # DMA channel to use for generating signal
LED_BRIGHTNESS = 255    # Set to 0 for darkest and 255 for brightest
LED_INVERT = False      # True to invert the signal (when using NPN transistor level shift)

# Initialize LED strip:
strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS)
strip.begin()

def get_brightness(current_time, cycle_duration, min_brightness, max_brightness):
    """ Calculate the brightness based on the current time within the pulsation cycle. """
    cycle_position = (current_time % cycle_duration) / cycle_duration
    if cycle_position < 0.5:
        return min_brightness + int(2 * cycle_position * (max_brightness - min_brightness))
    else:
        return max_brightness - int(2 * (cycle_position - 0.5) * (max_brightness - min_brightness))

def purple_pulsation(strip, cycle_duration=2, min_brightness=0, max_brightness=255):
    """ Creates a continuous pulsating purple effect on the specified LED strip. """
    while True:
        current_time = time.time()
        brightness = get_brightness(current_time, cycle_duration, min_brightness, max_brightness)
        adjusted_color = Color(brightness // 2, 0, brightness // 2)  # Adjust the purple color brightness

        for i in range(strip.numPixels()):
            strip.setPixelColor(i, adjusted_color)
        strip.show()

# Start the purple pulsation effect
purple_pulsation(strip)
