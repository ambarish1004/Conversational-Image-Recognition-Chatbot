import sys
import json
import torch
from PIL import Image, ImageDraw
import os
import numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
import google.generativeai as genai

genai.configure(api_key="AIzaSyC1m-06YktTukjS6lrbvsCvN6ALZWzjWro")

if len(sys.argv) < 2:
    print(json.dumps({"error": "No image path provided"}))
    sys.exit(1)

image_path = sys.argv[1]
output_path = image_path.replace(".jpg", "_processed.jpg").replace(".png", "_processed.png")

def load_yolo_model():
    try:
        yolo_model = torch.hub.load('ultralytics/yolov5', 'yolov5m', pretrained=True, trust_repo=True)
        return yolo_model
    except Exception as e:
        print(json.dumps({"error": f"Failed to load YOLO model: {e}"}))
        sys.exit(1)

yolo_model = load_yolo_model()

def detect_and_draw(image_path, output_path):
    img = Image.open(image_path)
    results = yolo_model(img)
    detection_df = results.pandas().xyxy[0]

    if detection_df.empty:
        print(json.dumps({"detected_objects": [], "processed_image": None}))
        return
    
    draw = ImageDraw.Draw(img)
    for _, row in detection_df.iterrows():
        x1, y1, x2, y2 = row["xmin"], row["ymin"], row["xmax"], row["ymax"]
        label = row["name"]
        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        draw.text((x1, y1 - 10), label, fill="red")

    img.save(output_path)
    detected_objects = detection_df["name"].tolist()
    print(json.dumps({"detected_objects": detected_objects, "processed_image": output_path}))

detect_and_draw(image_path, output_path)