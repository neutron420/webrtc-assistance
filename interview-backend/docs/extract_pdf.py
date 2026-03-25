import sys
from pypdf import PdfReader

try:
    reader = PdfReader(r'c:\Users\R.K Singh\Desktop\webrtc-assistance\interview-backend\docs\Project 13- Interview Preparation Chatbot with Real-Time Feedback.pdf')
    text = ''
    for i, page in enumerate(reader.pages):
        text += f"\n--- Page {i+1} ---\n"
        text += page.extract_text()
    
    with open(r'c:\Users\R.K Singh\Desktop\webrtc-assistance\interview-backend\docs\pdf_content.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    print("PDF extracted successfully.")
except Exception as e:
    print(f"Error reading PDF: {e}")
