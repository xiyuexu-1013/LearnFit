import math

class FatigueDetector:
    MOUTH_IDXS = [78, 308, 13, 14]

    @staticmethod
    def _dist(p1, p2, w, h):
        return math.sqrt((p1.x * w - p2.x * w)**2 + (p1.y * h - p2.y * h)**2)

    @classmethod
    def calculate_mar(cls, landmarks, width, height):
        left = landmarks[cls.MOUTH_IDXS[0]]
        right = landmarks[cls.MOUTH_IDXS[1]]
        top = landmarks[cls.MOUTH_IDXS[2]]
        bottom = landmarks[cls.MOUTH_IDXS[3]]

        horizontal_dist = cls._dist(left, right, width, height)
        vertical_dist = cls._dist(top, bottom, width, height)

        if horizontal_dist == 0: return 0
        return vertical_dist / horizontal_dist
