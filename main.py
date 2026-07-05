import cv2
import threading
import asyncio
from backend.camera import Camera
from backend.face_detector import FaceDetector
from backend.eye import EyeFeatures
from backend.blink import BlinkDetector
from backend.head_pose import HeadPoseEstimator
from backend.fatigue import FatigueDetector
from backend.attention import AttentionEngine
from backend.websocket_server import WSServer

def run_vision_pipeline(ws_server):
    cam = Camera()
    detector = FaceDetector()
    blink_tracker = BlinkDetector()
    pose_estimator = HeadPoseEstimator()
    attention_engine = AttentionEngine()

    while True:
        frame = cam.get_frame()
        if frame is None:
            break
            
        h, w = frame.shape[:2]
        landmarks = detector.process(frame)

        if landmarks:
            # 1. 特征提取
            ear = EyeFeatures.calculate_ear(landmarks, w, h)
            mar = FatigueDetector.calculate_mar(landmarks, w, h)
            pitch, yaw, roll = pose_estimator.estimate(landmarks, w, h)
            
            # 2. 状态追踪
            blink_freq, blink_dur = blink_tracker.update(ear)
            simulated_pupil = max(2.0, min(4.0, (ear / 0.30) * 3.4)) # 基于 EAR 模拟瞳孔
            
            # 3. 算法评分 (融合 TVST/AHP 权重)
            b_sc, d_sc, p_sc, total_score, status = attention_engine.calculate_score(
                blink_freq, blink_dur, simulated_pupil, mar, pitch, yaw
            )
            
            # 4. 数据组装
            payload = {
                "focus_score": total_score,
                "blink_score": b_sc,
                "duration_score": d_sc,
                "pupil_score": p_sc,
                "blink_frequency": blink_freq,
                "blink_duration": blink_dur,
                "pupil_diameter": round(simulated_pupil, 1),
                "threshold": 35,
                "status": status,
                "mode": "real"
            }
            
            # 5. 推送给 WebSocket
            ws_server.update_data(payload)

            # --- 画布显示给操作员 ---
            cv2.putText(frame, f"Focus: {total_score} | EAR: {ear:.2f} | MAR: {mar:.2f}", 
                        (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f"Yaw: {yaw:.0f} | Pitch: {pitch:.0f}", 
                        (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        cv2.imshow("LearnFit Backend Engine", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cam.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    server = WSServer()
    # 开启 CV 线程
    cv_thread = threading.Thread(target=run_vision_pipeline, args=(server,), daemon=True)
    cv_thread.start()
    # 在主线程运行 asyncio 网络循环
    asyncio.run(server.start())
