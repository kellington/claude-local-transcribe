#!/usr/bin/env python3

import sys
import os
import ssl
from datetime import datetime
import whisper_timestamped as whisper
import librosa

# Fix SSL certificate issues
import certifi
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
os.environ['SSL_CERT_FILE'] = certifi.where()

# Create an unverified SSL context as fallback
ssl._create_default_https_context = ssl._create_unverified_context

def get_audio_duration(audio_file_path):
    """Get audio duration using librosa"""
    try:
        y, sr = librosa.load(audio_file_path)
        duration = librosa.get_duration(y=y, sr=sr)
        return duration
    except:
        return 0.0

def transcribe_audio(audio_file_path):
    try:
        # Load Whisper model (try large first, fallback to base)
        print("Loading Whisper model...", file=sys.stderr)
        
        try:
            model = whisper.load_model("large", device="cpu")
            print("Loaded large model", file=sys.stderr)
        except Exception as e:
            print(f"Failed to load large model, trying base: {e}", file=sys.stderr)
            try:
                model = whisper.load_model("base", device="cpu")
                print("Loaded base model", file=sys.stderr)
            except Exception as e2:
                print(f"Failed to load base model, trying tiny: {e2}", file=sys.stderr)
                model = whisper.load_model("tiny", device="cpu")
                print("Loaded tiny model", file=sys.stderr)
        
        # Transcribe the audio file
        print("Transcribing audio...", file=sys.stderr)
        result = whisper.transcribe(model, audio_file_path)
        
        # Get transcription text and detected language
        transcription_text = result["text"].strip()
        detected_language = result.get("language", "unknown")
        
        # Convert language code to readable name
        language_names = {
            "en": "English",
            "fr": "French", 
            "es": "Spanish",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "ru": "Russian",
            "ja": "Japanese",
            "zh": "Chinese",
            "ko": "Korean"
        }
        language_display = language_names.get(detected_language, detected_language.capitalize())
        
        # Get audio file info
        audio_filename = os.path.basename(audio_file_path)
        
        # Calculate duration
        duration_seconds = get_audio_duration(audio_file_path)
        duration_minutes = int(duration_seconds // 60)
        duration_remaining_seconds = int(duration_seconds % 60)
        duration_str = f"{duration_minutes}:{duration_remaining_seconds:02d}"
        
        # Create timestamp
        now = datetime.now()
        date_str = now.strftime("%B %d, %Y, %-I:%M %p")
        
        # Create markdown content
        markdown_content = f"""# Transcription
**Date:** {date_str}  
**Duration:** {duration_str}  
**File:** {audio_filename}  
**Detected Language:** {language_display}

---

{transcription_text}
"""
        
        # Save markdown file
        base_name = os.path.splitext(audio_filename)[0]
        transcriptions_dir = os.path.expanduser("~/transcriptions")
        markdown_file_path = os.path.join(transcriptions_dir, f"{base_name}.md")
        
        with open(markdown_file_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        # Return the transcription text for display in the app
        print(transcription_text)
        return transcription_text
        
    except Exception as e:
        print(f"Error during transcription: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python transcribe.py <audio_file_path>", file=sys.stderr)
        sys.exit(1)
    
    audio_file = sys.argv[1]
    
    if not os.path.exists(audio_file):
        print(f"Audio file does not exist: {audio_file}", file=sys.stderr)
        sys.exit(1)
    
    transcribe_audio(audio_file)