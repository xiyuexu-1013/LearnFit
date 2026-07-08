# LearnFit

### An AI-Powered Real-Time Cognitive Attention Monitoring System for Personalized Learning Rhythm Discovery

<p align="center">
  <img src="assets/banner.png" width="900"/>
</p>

<p align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue)
![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-green)
![MediaPipe](https://img.shields.io/badge/MediaPipe-FaceMesh-orange)
![WebSocket](https://img.shields.io/badge/WebSocket-Realtime-red)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

</p>

---

# Abstract

Maintaining sustained attention during learning is challenging, yet most educational technologies evaluate performance only after cognitive fatigue has already occurred.

LearnFit is a real-time cognitive attention monitoring system that continuously estimates a learner's attentional state using multimodal facial behavioral signals. Instead of relying on questionnaires or wearable physiological sensors, LearnFit performs non-contact computer vision analysis through a standard webcam and provides interpretable attention scores together with personalized learning rhythm recommendations.

The system integrates eye openness, blink dynamics, mouth aspect ratio, and head pose into a unified scoring framework, enabling continuous visualization of attention changes while simultaneously recording experimental data for subsequent analysis.

---

# Research Motivation

Traditional study methods often encourage students to work for predetermined durations (e.g., 60–90 minutes) regardless of their actual cognitive state.

However,

> **Cognitive fatigue develops continuously rather than discretely.**

This project investigates whether facial behavioral signals can be used to estimate attention changes in real time and identify an individual's optimal learning rhythm before significant performance degradation occurs.

---

# Research Hypothesis

We hypothesize that:

> Continuous multimodal facial behavioral analysis can estimate cognitive attention levels in real time and identify personalized attention thresholds that improve learning efficiency compared with fixed-duration study strategies.

---

# System Architecture

```
                  Webcam
                     │
                     ▼
          MediaPipe Face Mesh
                     │
                     ▼
      Feature Extraction Layer
     ├── Eye Aspect Ratio (EAR)
     ├── Blink Frequency
     ├── Blink Duration
     ├── Mouth Aspect Ratio (MAR)
     └── Head Pose Estimation
                     │
                     ▼
      Attention Scoring Engine
                     │
                     ▼
         WebSocket Communication
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
 Dashboard Visualization   CSV Experiment Logger
```

---

# Core Features

## Real-Time Computer Vision

* Face landmark detection using MediaPipe Face Mesh
* Eye Aspect Ratio (EAR) estimation
* Blink frequency monitoring
* Blink duration analysis
* Mouth Aspect Ratio (MAR) calculation
* Head pose estimation (Pitch / Yaw / Roll)

---

## Attention Scoring Engine

The scoring engine combines multiple behavioral indicators into a continuous attention score.

Current indicators include:

* Eye openness
* Blink frequency
* Blink duration
* Head movement
* Fatigue-related facial behavior

The output is mapped into interpretable cognitive states such as:

* Effective Focus
* Mild Distraction
* Sustained Distraction
* Recommended Break

---

## Real-Time Dashboard

The dashboard provides:

* Live attention score
* Historical attention trend
* AI recommendation
* Experiment status
* Comparative learning visualization

Designed specifically for projection during research demonstrations and science competitions.

---

## Experiment Recording

LearnFit supports automated experiment recording.

Each session exports:

* Timestamp
* Attention Score
* Blink Frequency
* Blink Duration
* Eye Openness (EAR)
* Cognitive Status

The exported CSV files can be directly analyzed using Python or spreadsheet software.

---

# Repository Structure

```
LearnFit/

├── backend/
│   ├── attention.py
│   ├── blink.py
│   ├── camera.py
│   ├── eye.py
│   ├── face_detector.py
│   ├── fatigue.py
│   ├── head_pose.py
│   └── websocket_server.py
│
├── frontend/
│   └── dashboard.html
│
├── generate_report.py
├── main.py
├── requirements.txt
└── README.md
```

---

# Technology Stack

| Layer                   | Technology                         |
| ----------------------- | ---------------------------------- |
| Programming Language    | Python                             |
| Computer Vision         | OpenCV                             |
| Face Landmark Detection | MediaPipe Face Mesh                |
| Numerical Computing     | NumPy                              |
| Communication           | WebSocket                          |
| Visualization           | HTML + CSS + JavaScript + Chart.js |

---

# Experimental Workflow

1. Launch the backend engine.
2. Open the dashboard.
3. Begin an experimental session.
4. Perform a continuous learning task.
5. Record facial behavioral signals.
6. Stop the experiment.
7. Export CSV data.
8. Generate experimental figures.

---

# Example Output

The system automatically records experimental sessions such as:

| Timestamp | Score | Blink Frequency |  EAR | Status                |
| --------- | ----: | --------------: | ---: | --------------------- |
| 00:00:05  |  82.4 |               9 | 0.31 | Effective Focus       |
| 00:00:21  |  74.6 |              11 | 0.28 | Mild Distraction      |
| 00:00:45  |  55.8 |              16 | 0.22 | Sustained Distraction |

---

# Future Work

Future versions of LearnFit will explore:

* Personalized attention models
* Machine learning–based scoring
* Long-term attention prediction
* Adaptive study scheduling
* Cross-subject validation
* Multimodal physiological sensing
* Mobile deployment

---

# Reproducibility

Install dependencies

```bash
pip install -r requirements.txt
```

Run the backend

```bash
python main.py
```

Generate experiment reports

```bash
python generate_report.py
```

Open the dashboard in a browser to visualize the real-time monitoring system.

---

# Citation

If you use this project in research or educational work, please cite:

```
Xu, X.
LearnFit: An AI-Powered Real-Time Cognitive Attention Monitoring System for Personalized Learning Rhythm Discovery.
GitHub Repository.
```

---

# Author

**Xiyue Xu**

Independent Research Project

Computer Vision · Human–Computer Interaction · Educational AI · Cognitive Computing

