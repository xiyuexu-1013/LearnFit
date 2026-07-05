import math

class EyeFeatures:
    LEFT_EYE_IDXS = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE_IDXS = [362, 385, 387, 263, 373, 380]

    @staticmethod
    def _euclidean_distance(p1, p2, width, height):
        return math.sqrt((p1.x * width - p2.x * width)**2 + (p1.y * height - p2.y * height)**2)

    @classmethod
    def calculate_ear(cls, landmarks, width, height):
        def _ear(indices):
            p1_p4 = cls._euclidean_distance(landmarks[indices[0]], landmarks[indices[3]], width, height)
            p2_p6 = cls._euclidean_distance(landmarks[indices[1]], landmarks[indices[5]], width, height)
            p3_p5 = cls._euclidean_distance(landmarks[indices[2]], landmarks[indices[4]], width, height)
            if p1_p4 == 0:
                return 0
            return (p2_p6 + p3_p5) / (2.0 * p1_p4)

        left_ear = _ear(cls.LEFT_EYE_IDXS)
        right_ear = _ear(cls.RIGHT_EYE_IDXS)
        return (left_ear + right_ear) / 2.0
