import time
from collections import deque

class BlinkDetector:
    def __init__(self, ear_threshold=0.22):
        self.ear_threshold = ear_threshold
        self.blink_timestamps = deque()
        self.is_blinking = False
        self.blink_start_time = 0
        self.latest_duration_ms = 0

    def update(self, current_ear):
        current_time = time.time()
        
        while self.blink_timestamps and current_time - self.blink_timestamps[0] > 60:
            self.blink_timestamps.popleft()

        if current_ear < self.ear_threshold:
            if not self.is_blinking:
                self.is_blinking = True
                self.blink_start_time = current_time
        else:
            if self.is_blinking:
                self.is_blinking = False
                duration_ms = int((current_time - self.blink_start_time) * 1000)
                self.latest_duration_ms = duration_ms
                self.blink_timestamps.append(current_time)

        freq_per_min = len(self.blink_timestamps)
        return freq_per_min, self.latest_duration_ms
