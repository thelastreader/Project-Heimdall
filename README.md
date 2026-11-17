# 👁️ Project Heimdall

**Multimodal Medical Diagnostic System**

## 📌 Overview

Project Heimdall is an advanced, deep learning-based diagnostic system designed to assist in the highly accurate detection of respiratory illnesses. Acting as an "all-seeing" evaluator, Heimdall cross-references radiographic imaging with clinical patient presentations. This dual-stream approach is engineered to prevent shortcut learning and reduce diagnostic errors caused by contradictory clinical symptoms, ensuring a more reliable evaluation.

This repository contains the full-stack implementation of the project, encompassing a high-performance backend serving the AI models and a modern, responsive frontend interface.

## 🏗️ System Capabilities

The core diagnostic engine utilizes a **Multimodal Feature Fusion** approach to bridge the gap between visual data and clinical context:

*   **Visual Stream:** Utilizes deep learning computer vision backbones to extract and analyze spatial feature representations from medical scans.
*   **Clinical Stream:** Processes structured clinical symptom vectors and patient health indicators through a dedicated neural network.
*   **Intelligent Fusion:** The system intelligently integrates data from both streams, anchoring visual predictions with real-world clinical priors to deliver highly robust diagnostics.

## 💻 Tech Stack

*   **Machine Learning & AI:** PyTorch Ecosystem, Scikit-learn
*   **Backend API:** FastAPI, Uvicorn, Python 3.10+
*   **Frontend Client:** React 18, TypeScript, Tailwind CSS
*   **Deployment & Tooling:** Git, ASGI

## 🚀 Quick Start (Local Development)

### Prerequisites

*   Python 3.10+
*   Node.js v18+ & npm

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend application will be available at `http://localhost:3000`.

## ⚠️ Important Disclaimer: Academic Project Only

**This software is strictly a B.Tech Final Year Major Project developed for academic and research purposes.** 

Project Heimdall is **NOT** a certified or approved medical device. It must not be used for actual clinical diagnosis, patient care, medical decision-making, or any legal/medical purposes whatsoever. The models and methodologies explored in this repository are experimental. Under no circumstances should the outputs of this system be interpreted as professional medical advice. 

To maintain academic integrity and data security, sensitive local datasets and proprietary trained model weights (`.pth`) have been explicitly excluded from this public repository.
