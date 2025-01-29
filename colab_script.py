from flask import Flask, request, jsonify
import torch
from PIL import Image
import os
import numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
import requests
import google.generativeai as genai

# Configure Gemini AI
genai.configure(api_key="AIzaSyC1m-06YktTukjS6lrbvsCvN6ALZWzjWro")

app = Flask(__name__)

def ask_gemini(question):
    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={
                "temperature": 1,
                "top_p": 0.95,
                "top_k": 64,
                "max_output_tokens": 200,
                "response_mime_type": "text/plain",
            }
        )
        chat_session = model.start_chat(history=[])
        response = chat_session.send_message(question)
        return response.text
    except Exception as e:
        return f"Error communicating with Gemini AI: {e}"

def load_yolo_model():
    try:
        yolo_model = torch.hub.load('ultralytics/yolov5', 'yolov5m', pretrained=True)
        return yolo_model
    except Exception as e:
        print(f"Error loading YOLO model: {e}")
        return None

def detect_objects(yolo_model, image_path):
    try:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file '{image_path}' does not exist.")

        img = Image.open(image_path)
        results = yolo_model(img)
        results.show()

        detection_df = results.pandas().xyxy[0]
        return detection_df, img
    except Exception as e:
        print(f"Error during object detection: {e}")
        return None, None

def chatbot_response(input_text):
    try:
        tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-small")
        chatbot_model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-small")

        inputs = tokenizer.encode(input_text + tokenizer.eos_token, return_tensors='pt')
        reply_ids = chatbot_model.generate(inputs, max_length=1000, pad_token_id=tokenizer.eos_token_id)
        return tokenizer.decode(reply_ids[:, inputs.shape[-1]:][0], skip_special_tokens=True)
    except Exception as e:
        return f"Error generating chatbot response: {e}"

def get_image_response(yolo_model, image_path):
    detection_data, img = detect_objects(yolo_model, image_path)
    if detection_data is not None:
        detection_data = detection_data[detection_data['confidence'] > 0.5]
        if not detection_data.empty:
            objects_description = ", ".join(detection_data['name'].tolist())
            chatbot_input = f"I see the following objects: {objects_description}."
            return chatbot_response(chatbot_input), detection_data, img
        else:
            return "No objects detected in the image.", None, None
    else:
        return "Error processing image.", None, None

@app.route('/process-image', methods=['POST'])
def process_image():
    try:
        data = request.json
        image_path = data.get('image_path')
        if not image_path:
            return jsonify({"error": "Image path is required."}), 400

        yolo_model = load_yolo_model()
        if not yolo_model:
            return jsonify({"error": "Failed to load YOLO model."}), 500

        response, detection_data, _ = get_image_response(yolo_model, image_path)
        if detection_data is not None and not detection_data.empty:
            object1 = detection_data['name'].iloc[0]
            ai_initial_response = ask_gemini(f"Tell me more about {object1} in short in plain text paragraph.")
            return jsonify({
                "chatbot_response": response,
                "detected_object": object1,
                "ai_response": ai_initial_response
            })
        else:
            return jsonify({"chatbot_response": response}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)