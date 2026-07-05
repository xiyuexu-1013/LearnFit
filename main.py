import cv2
import threading
import asyncio
import time
import csv
from datetime import datetime

from backend.camera import Camera
from backend.face_detector import FaceDetector
from backend.eye import EyeFeatures
from backend.blink import BlinkDetector
from backend.head_pose import HeadPoseEstimator
from backend.fatigue import FatigueDetector
from backend.attention import AttentionEngine
from backend.websocket_server import WSServer

# 全局实验状态变量
is_recording = False
csv_file = None
csv_writer = None

def process_commands(ws_server):
    """处理来自前端看板的控制指令"""
    global is_recording, csv_file, csv_writer
    while ws_server.command_queue:
        cmd = ws_server.command_queue.pop(0)
        if cmd.get("action") == "start":
            if not is_recording:
                is_recording = True
                filename = f"LearnFit_Data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                csv_file = open(filename, mode='w', newline='', encoding='utf-8')
                csv_writer = csv.writer(csv_file)
                csv_writer.writerow(["Timestamp", "FocusScore", "BlinkFreq", "BlinkDur", "PupilDia", "Status"])
                print(f"⏺️ 实验开始，数据正写入: {filename}")
        elif cmd.get("action") == "stop":
            if is_recording:
                is_recording = False
                if csv_file:
                    csv_file.close()
                print("⏹️ 实验结束，文件已保存。")

def run_vision_pipeline(ws_server):
    global is_recording, csv_writer
    cam = Camera()
    detector = FaceDetector()
    blink_tracker = BlinkDetector()
    pose_estimator = HeadPoseEstimator()
    attention_engine = AttentionEngine()

    try:
        while True:
            start_time = time.time()
            process_commands(ws_server) # 检查前端指令

            frame = cam.get_frame()
            if frame is None:
                continue
                
            h, w = frame.shape[:2]
            
            # 全局防崩机制：隔离算法层的任何异常
            try:
                landmarks = detector.process(frame)
                
                if landmarks:
                    ear = EyeFeatures.calculate_ear(landmarks, w, h)
                    # 防止 EAR 极值引发的数学崩塌
                    if ear <= 0.01: ear = 0.01 
                    
                    mar = FatigueDetector.calculate_mar(landmarks, w, h)
                    pitch, yaw, roll = pose_estimator.estimate(landmarks, w, h)
                    
                    blink_freq, blink_dur = blink_tracker.update(ear)
                    simulated_pupil = max(2.0, min(4.0, (ear / 0.30) * 3.4)) 
                    
                    b_sc, d_sc, p_sc, total_score, status = attention_engine.calculate_score(
                        blink_freq, blink_dur, simulated_pupil, mar, pitch, yaw
                    )
                    
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
                    ws_server.update_data(payload)

                    # 记录实验数据
                    if is_recording and csv_writer:
                        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                        csv_writer.writerow([timestamp, total_score, blink_freq, blink_dur, round(simulated_pupil, 1), status])

                    # 渲染画面
                    cv2.putText(frame, f"Focus: {total_score} | REC: {'ON' if is_recording else 'OFF'}", 
                                (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255) if is_recording else (0, 255, 0), 2)
            except Exception as e:
                print(f"⚠️ Pipeline 异常已拦截跳过: {e}")

           #cv2.waitKey(1)
            
            # 安全退出机制
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            # 帧率控制 (锁定最高约 30 FPS，释放 CPU 性能)
            elapsed = time.time() - start_time
            sleep_time = max(0, (1.0 / 30) - elapsed)
            time.sleep(sleep_time)

    except KeyboardInterrupt:
        print("\n🛑 接收到退出信号，安全关闭中...")
    finally:
        cam.release()
        cv2.destroyAllWindows()
        if is_recording and csv_file:
            csv_file.close()
        print("✅ 摄像头已释放，系统安全退出。")

if __name__ == "__main__":
    server = WSServer()
    cv_thread = threading.Thread(target=run_vision_pipeline, args=(server,), daemon=True)
    cv_thread.start()
    
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("网络服务已终止。")
