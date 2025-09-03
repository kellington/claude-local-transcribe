# EchoDown - Setup Instructions

## Prerequisites

First, install FFmpeg using Homebrew (required for audio processing):

```bash
brew install ffmpeg
```

## Installation Steps

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install Python dependencies:**
   ```bash
   # Option 1: Using the npm script
   npm run setup-python
   
   # Option 2: Direct pip install
   python3 -m pip install -r requirements.txt
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

## Troubleshooting

### If you get FFmpeg-related errors:
```bash
brew install ffmpeg
```

### If you get permission errors with pip:
```bash
python3 -m pip install --user -r requirements.txt
```

### If you have Python 3.13 compatibility issues:
Try using Python 3.11 or 3.12:
```bash
# Using pyenv to manage Python versions
brew install pyenv
pyenv install 3.11.9
pyenv local 3.11.9
python3 -m pip install -r requirements.txt
```

### If Whisper model download fails:
The app will automatically download the Whisper large model on first use. This may take a few minutes and requires an internet connection initially. The model is about 2.9GB.

## What Changed

I switched from `faster-whisper` to the original `openai-whisper` package to avoid the PyAV compilation issues you were experiencing with Python 3.13. This approach:

- Uses pre-compiled wheels that work with Python 3.13
- Avoids the complex FFmpeg/PyAV compilation issues
- Still provides excellent transcription quality with the large Whisper model
- Requires only FFmpeg for audio processing (no pkg-config needed)

## System Requirements

- macOS (optimized for M2 hardware)
- Python 3.8 or higher (3.11-3.12 recommended for best compatibility)
- Node.js 16 or higher
- FFmpeg (via Homebrew)