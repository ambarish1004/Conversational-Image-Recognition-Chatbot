import sys
import json
import torch
import cv2
import numpy as np
from PIL import Image, ImageDraw
import os
from transformers import AutoModelForCausalLM, AutoTokenizer
import google.generativeai as genai

# Google API Configuration (If needed for AI integration)
genai.configure(api_key="AIzaSyC1m-06YktTukjS6lrbvsCvN6ALZWzjWro")

if len(sys.argv) < 2:
    print(json.dumps({"error": "No image path provided"}))
    sys.exit(1)

image_path = sys.argv[1]
output_path = image_path.replace(".jpg", "_processed.jpg").replace(".png", "_processed.png")

# **Load YOLOv5 Model**
def load_yolo_model():
    try:
        yolo_model = torch.hub.load('ultralytics/yolov5', 'yolov5m', pretrained=True, trust_repo=True)
        return yolo_model
    except Exception as e:
        print(json.dumps({"error": f"Failed to load YOLO model: {e}"}))
        sys.exit(1)

yolo_model = load_yolo_model()

# **Extract Dominant Color from Bounding Box Area**
def get_dominant_color(image, bbox):
    x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
    roi = image[y1:y2, x1:x2]

    if roi.size == 0:
        return "Unknown"

    # Convert ROI to a list of pixels
    pixels = roi.reshape(-1, 3)
    pixels = np.float32(pixels)

    # Use KMeans clustering to find the dominant color
    num_clusters = 3
    _, labels, centers = cv2.kmeans(pixels, num_clusters, None,
                                    (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0),
                                    10, cv2.KMEANS_RANDOM_CENTERS)

    # Find the most common cluster
    _, counts = np.unique(labels, return_counts=True)
    dominant_color = centers[np.argmax(counts)]

    # Convert BGR to simple color name
    return get_color_name(dominant_color)

# **Map RGB to Basic Color Names**
def get_color_name(rgb):
    colors = {
        "red": (255, 0, 0),
        "green": (0, 255, 0),
        "blue": (0, 0, 255),
        "yellow": (255, 255, 0),
        "purple": (128, 0, 128),
        "orange": (255, 165, 0),
        "black": (0, 0, 0),
        "white": (255, 255, 255),
        "gray": (128, 128, 128),
        "brown": (165, 42, 42)
    }

    min_distance = float("inf")
    closest_color = "Unknown"
    for color, rgb_val in colors.items():
        distance = np.linalg.norm(np.array(rgb) - np.array(rgb_val))
        if distance < min_distance:
            min_distance = distance
            closest_color = color

    return closest_color

# **Detect Objects & Extract Colors**
def detect_and_draw(image_path, output_path):
    img_pil = Image.open(image_path)
    img_cv2 = cv2.imread(image_path)  # Load for OpenCV processing
    results = yolo_model(img_pil)
    detection_df = results.pandas().xyxy[0]

    if detection_df.empty:
        print(json.dumps({"detected_objects": [], "processed_image": None, "object_colors": {}}))
        return

    draw = ImageDraw.Draw(img_pil)
    object_colors = {}

    for _, row in detection_df.iterrows():
        x1, y1, x2, y2 = row["xmin"], row["ymin"], row["xmax"], row["ymax"]
        label = row["name"]

        # Extract color for each object
        dominant_color = get_dominant_color(img_cv2, (x1, y1, x2, y2))
        object_colors[label] = dominant_color

        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        draw.text((x1, y1 - 10), f"{label} ({dominant_color})", fill="red")

    img_pil.save(output_path)
    detected_objects = detection_df["name"].tolist()
    
    # Output JSON with detected objects and colors
    print(json.dumps({
        "detected_objects": detected_objects,
        "processed_image": output_path,
        "object_colors": object_colors
    }))

# **Run Detection**
detect_and_draw(image_path, output_path)
