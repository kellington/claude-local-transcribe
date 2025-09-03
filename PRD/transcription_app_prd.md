# Transcription App - Product Requirements Document

## Overview
A simple macOS desktop application for high-quality local audio transcription to replace the default macOS transcription. Built for personal productivity and note-taking workflows.

## Core Requirements

### Functional Requirements
1. **Audio Recording**
   - Record audio directly through the app interface
   - Simple Record/Stop button workflow
   - Maximum recording length: 10 minutes (configurable)
   - Audio format: WAV, 44.1kHz sample rate

2. **Transcription**
   - Use OpenAI Whisper Large v3 model for maximum accuracy
   - Process audio locally (no internet required)
   - Generate transcription automatically after recording stops

3. **File Management**
   - Save audio files and transcriptions to local folder: `~/transcriptions/`
   - Naming convention: `YYYY-MM-DD_HH-MM-SS.wav` and `.md`
   - Both files saved with matching timestamps

4. **Output Format**
   - Generate simple Markdown files with metadata header
   - Include: date/time, duration, original filename
   - Clean transcribed text below metadata section

### Technical Requirements
1. **Platform**: macOS only, optimized for M2 hardware
2. **Architecture**: Electron app with Python backend
3. **Dependencies**:
   - Electron for UI
   - faster-whisper for transcription processing
   - Node.js native audio recording
4. **Local-first**: No internet connection required for core functionality

## User Interface

### Main Window
- Minimalist design with large Record/Stop button
- Real-time recording indicator (duration counter)
- Status messages: "Ready", "Recording...", "Processing...", "Complete"
- Recent transcriptions list (last 10 files)
- Settings button for basic configuration

### Output Preview
- Display transcribed text in app after processing
- Copy to clipboard functionality
- Open containing folder button

## File Structure Example

### Audio File
```
~/transcriptions/2025-09-02_14-30-15.wav
```

### Markdown Output
```markdown
# Transcription
**Date:** September 2, 2025, 2:30 PM  
**Duration:** 0:02:34  
**File:** 2025-09-02_14-30-15.wav

---

[Transcribed text content here]
```

## Technical Implementation Notes

### Backend Processing
- Python script using faster-whisper library
- Subprocess communication between Electron and Python
- Error handling for audio processing failures
- Progress indication during transcription

### Audio Recording
- Use Web Audio API or Node.js native modules
- Temporary file creation during recording
- Automatic cleanup of temp files

### Configuration
- Default save location: `~/transcriptions/`
- Configurable max recording length
- Audio quality settings

## Success Criteria
1. **Accuracy**: Transcription quality significantly better than macOS default
2. **Speed**: Processing time under 30 seconds for 3-minute audio clips
3. **Reliability**: Handles various audio conditions and microphone inputs
4. **Simplicity**: Single-click recording workflow with no configuration required

## Non-Requirements (Phase 1)
- Real-time transcription
- Multiple language support (English only initially)
- Cloud sync or backup
- Advanced editing features
- Batch processing of existing files
- Export to other formats

## Future Considerations
- Automatic punctuation and formatting improvements
- Speaker identification for meetings
- Integration with note-taking apps
- Keyboard shortcuts for quick recording