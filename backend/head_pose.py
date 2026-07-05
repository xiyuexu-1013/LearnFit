import cv2
import numpy as np
import math

class HeadPoseEstimator:
    def __init__(self):
        self.model_points = np.array([
            (0.0, 0.0, 0.0),             # 鼻尖
            (0.0, -330.0, -65.0),        # 下巴
            (-225.0, 170.0, -135.0),     # 左眼左角
            (225.0, 170.0, -135.0),      # 右眼右角
            (-150.0, -150.0, -125.0),    # 左嘴角
            (150.0, -150.0, -125.0)      # 右嘴角
        ])
        self.landmark_idxs = [1, 152, 33, 263, 61, 291]

    def estimate(self, landmarks, frame_width, frame_height):
        image_points = np.array([
            (landmarks[idx].x * frame_width, landmarks[idx].y * frame_height) 
            for idx in self.landmark_idxs
        ], dtype="double")

        focal_length = frame_width
        center = (frame_width/2, frame_height/2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype="double")

        dist_coeffs = np.zeros((4,1))
        success, rotation_vec, translation_vec = cv2.solvePnP(
            self.model_points, image_points, camera_matrix, dist_coeffs
        )
        
        if success:
            rotation_mat, _ = cv2.Rodrigues(rotation_vec)
            angles, _, _, _, _, _ = cv2.RQDecomp3x3(rotation_mat)
            pitch, yaw, roll = [math.degrees(a) for a in angles]
            return pitch, yaw, roll
        return 0, 0, 0
