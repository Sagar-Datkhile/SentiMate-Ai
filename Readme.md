# SentiMate

### AI-Assisted Student Mental-Health Early-Warning and Counselling-Support Platform

SentiMate is an AI-assisted student mental-health support platform designed to help identify potential mental-health risks among university students through conversational interaction, Natural Language Processing (NLP), Machine Learning (ML), and Explainable AI (XAI).

The system provides a wellness chatbot through which students can express their concerns naturally. SentiMate analyses conversational and relevant contextual information to identify potential risk indicators and presents understandable insights to authorized counsellors.

> **Important:** SentiMate is a decision-support and early-warning system. It is not a clinical diagnostic system and does not replace professional counselling, medical assessment, or emergency mental-health services.

---

# 🧠 Overview

University students may experience academic pressure, social challenges, personal difficulties, uncertainty about their future, and other factors that can affect their mental well-being.

Traditional counselling systems generally depend on students voluntarily approaching counsellors or institutions. This can make early identification of concerns difficult.

SentiMate aims to provide an additional technology-assisted layer between students and counselling services.

The platform combines:

- Conversational AI
- Natural Language Processing
- Sentiment Analysis
- Emotion Analysis
- Text Feature Extraction
- Machine Learning
- XGBoost-based Risk Prediction
- Explainable AI using SHAP
- Counsellor Dashboard
- Human-in-the-loop review
- Privacy-aware data processing
- Anonymised institutional analytics

The primary objective is to generate **potential risk indications and understandable supporting information** that can assist authorized counsellors in deciding whether further attention may be appropriate.

---

# 🎯 Problem Statement

Mental-health concerns among university students can be influenced by academic pressure, social challenges, personal difficulties, and limited access to timely support.

Existing research has explored machine-learning prediction, multimodal analysis, conversational agents, sentiment analysis, and mental-health detection independently.

However, these approaches are often implemented as separate components rather than as a unified student-support workflow.

There is therefore a need for an integrated platform that can:

1. Allow students to communicate naturally.
2. Analyse conversational language and emotional signals.
3. Identify potential mental-health risk indicators.
4. Explain the factors contributing to a prediction.
5. Provide useful information to authorized counsellors.
6. Maintain privacy and confidentiality.
7. Keep professional review within the decision-making process.

SentiMate is proposed to address this integration gap.

---

# 🎯 Objectives

The main objectives of SentiMate are:

### 1. Conversational Support

Develop an AI-assisted wellness chatbot that allows students to express their concerns through natural conversation.

### 2. NLP-Based Analysis

Analyse conversational text to extract relevant linguistic, sentiment, semantic, and emotional information.

### 3. Mental-Health Risk Prediction

Develop a machine-learning mechanism to identify and classify potential student mental-health risk levels.

### 4. Explainable Predictions

Use Explainable AI techniques such as SHAP to provide understandable information about the factors contributing to individual predictions.

### 5. Counsellor Support

Provide counsellor-oriented insights through a human-in-the-loop framework while maintaining privacy and confidentiality.

---

# ✨ Key Features

## 🤖 AI-Assisted Wellness Chatbot

Students can communicate with SentiMate using natural language instead of filling out lengthy forms.

The chatbot can collect conversational information that may contain useful indicators related to:

- Academic stress
- Emotional difficulties
- Social concerns
- Motivation
- Sleep-related concerns
- Workload
- Personal difficulties
- General well-being

---

## 📝 NLP-Based Conversation Analysis

SentiMate processes conversational text using NLP techniques.

Potentially extracted information includes:

- Sentiment
- Emotion
- Linguistic patterns
- Sentence embeddings
- Semantic information
- Textual features
- Contextual indicators

---

## 📊 Machine-Learning Risk Prediction

Extracted features can be provided to a machine-learning model to estimate a potential risk category.

The proposed architecture can use **XGBoost** for structured feature-based risk prediction.

Example risk categories:

```text
Low
Medium
High