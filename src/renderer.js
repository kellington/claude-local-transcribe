const { ipcRenderer, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

class TranscriptionApp {
    constructor() {
        this.isRecording = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentTranscription = '';
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadRecentTranscriptions();
    }
    
    initializeElements() {
        this.recordButton = document.getElementById('recordButton');
        this.status = document.getElementById('status');
        this.timer = document.getElementById('timer');
        this.transcriptionResult = document.getElementById('transcriptionResult');
        this.transcriptionActions = document.getElementById('transcriptionActions');
        this.copyButton = document.getElementById('copyButton');
        this.openFolderButton = document.getElementById('openFolderButton');
        this.recentList = document.getElementById('recentList');
    }
    
    attachEventListeners() {
        this.recordButton.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });
        
        this.copyButton.addEventListener('click', () => {
            this.copyToClipboard();
        });
        
        this.openFolderButton.addEventListener('click', async () => {
            const transcriptionsDir = await ipcRenderer.invoke('get-transcriptions-dir');
            shell.showItemInFolder(transcriptionsDir);
        });
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            // Use specific MIME type for better audio quality
            const options = {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            };
            
            // Fallback to default if webm/opus not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                delete options.mimeType;
            }
            
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
                stream.getTracks().forEach(track => track.stop());
            };
            
            // Record in chunks to ensure we get data
            this.mediaRecorder.start(1000);
            
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.updateUI();
            this.startTimer();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateStatus('Error: Could not access microphone');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
            this.updateStatus('Processing...');
            this.updateUI();
        }
    }
    
    async processRecording() {
        try {
            // Create blob from recorded chunks
            const audioBlob = new Blob(this.audioChunks, { 
                type: this.mediaRecorder.mimeType || 'audio/webm' 
            });
            
            // Generate timestamp-based filename
            const now = new Date();
            const timestamp = now.toISOString()
                .replace(/:/g, '-')
                .replace(/\./g, '-')
                .slice(0, 19);
            
            // Save as WebM first, then convert to MP3
            const tempFilename = `${timestamp}.webm`;
            const finalFilename = `${timestamp}.mp3`;
            const transcriptionsDir = await ipcRenderer.invoke('get-transcriptions-dir');
            const tempFilePath = path.join(transcriptionsDir, tempFilename);
            const audioFilePath = path.join(transcriptionsDir, finalFilename);
            
            // Save the recorded blob
            const arrayBuffer = await audioBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(tempFilePath, buffer);
            
            // Convert to MP3 using FFmpeg
            this.updateStatus('Converting audio...');
            await this.convertToMp3(tempFilePath, audioFilePath);
            
            // Clean up temp file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            
            // Send to Python for transcription
            this.updateStatus('Transcribing...');
            const transcription = await ipcRenderer.invoke('transcribe-audio', audioFilePath);
            
            this.currentTranscription = transcription;
            this.displayTranscription(transcription);
            this.updateStatus('Complete');
            this.loadRecentTranscriptions();
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.updateStatus('Error: Failed to process recording');
        }
    }
    
    async convertToMp3(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            
            const ffmpeg = spawn('ffmpeg', [
                '-i', inputPath,
                '-acodec', 'mp3',
                '-ab', '128k',
                '-ar', '44100',
                '-ac', '1',
                '-y',
                outputPath
            ]);
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg conversion failed with code ${code}`));
                }
            });
            
            ffmpeg.on('error', (error) => {
                reject(error);
            });
        });
    }
    
    
    startTimer() {
        this.timer.classList.remove('hidden');
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Auto-stop at 10 minutes (as per PRD)
            if (minutes >= 10) {
                this.stopRecording();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timer.classList.add('hidden');
    }
    
    updateUI() {
        const recordText = this.recordButton.querySelector('.record-text');
        const recordIcon = this.recordButton.querySelector('.record-icon');
        
        this.recordButton.classList.remove('recording', 'processing');
        
        if (this.isRecording) {
            this.recordButton.classList.add('recording');
            recordText.textContent = 'Stop';
            recordIcon.textContent = '⏸️';
        } else if (this.status.textContent.includes('Processing') || this.status.textContent.includes('Transcribing')) {
            this.recordButton.classList.add('processing');
            recordText.textContent = 'Processing';
            recordIcon.textContent = '⏳';
        } else {
            recordText.textContent = 'Record';
            recordIcon.textContent = '🎤';
        }
    }
    
    updateStatus(message) {
        this.status.textContent = message;
        this.updateUI();
    }
    
    displayTranscription(text) {
        this.transcriptionResult.innerHTML = `<div class="transcription-text">${text}</div>`;
        this.transcriptionResult.classList.add('has-content');
        this.transcriptionActions.classList.remove('hidden');
    }
    
    copyToClipboard() {
        if (this.currentTranscription) {
            navigator.clipboard.writeText(this.currentTranscription).then(() => {
                const originalText = this.copyButton.textContent;
                this.copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    this.copyButton.textContent = originalText;
                }, 2000);
            });
        }
    }
    
    async loadRecentTranscriptions() {
        try {
            const recentFiles = await ipcRenderer.invoke('get-recent-transcriptions');
            
            if (recentFiles.length === 0) {
                this.recentList.innerHTML = '<div class="loading">No recent transcriptions</div>';
                return;
            }
            
            this.recentList.innerHTML = recentFiles.map(file => {
                const date = new Date(file.created).toLocaleDateString();
                const time = new Date(file.created).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                return `
                    <div class="recent-item" onclick="window.transcriptionApp.openRecentFile('${file.path}')">
                        <div class="recent-filename">${file.name.replace('.md', '')}</div>
                        <div class="recent-date">${date} ${time}</div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading recent transcriptions:', error);
            this.recentList.innerHTML = '<div class="error">Error loading recent transcriptions</div>';
        }
    }
    
    openRecentFile(filePath) {
        shell.showItemInFolder(filePath);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.transcriptionApp = new TranscriptionApp();
});