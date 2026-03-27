# AI Interview Platform: Proctoring Algorithm v3.0

This document outlines the high-reliability security and proctoring logic used to track candidate behavior during live sessions.

## 1. Monitoring Core (The "Heartbeat")
The security engine operates on a 200ms sampling tick (`0.2s frequency`). This ensures that even rapid movements are captured without straining the CPU.

## 2. Decision Logic (IsSuspect?)
A session is flagged as **"SUSPECT"** if any of the following conditions are met:
- **Eye Contact Score < 60%**: Calculated via weighted gaze, head pose, and vertical alignment.
- **Signal Loss**: No faces detected in the current frame by MediaPipe.
- **Proctoring Violation**: More than one face detected (Multi-face detection).
- **Device Usage**: Vertical nose-to-chin ratio < 0.3 (Indicating the user is looking down at a phone/object).

## 3. Signal Stabilization (Grace Period Buffer)
To prevent accidental violations caused by natural blinking or temporary light shifts:
- **The Reset Guard**: Suspect status is NOT cleared immediately when a good signal is received.
- **Grace Period (2.0s)**: A candidate must maintain a "Good" signal for **2 consecutive seconds** before the current violation accumulation is reset to zero.
- **Impact**: Flickering scores (e.g., 58%, 62%, 57%) will no longer reset the violation timer.

## 4. Violation Commitment (The Infraction)
- **Duration (6.0s)**: If a "Suspect" state persists for 6 continuous seconds (after the buffer), the `violations` counter increments by 1.
- **HUD Update**: The on-screen violation dots (`0/3`) are updated in real-time.

## 5. Security Termination
- **The 4th Attempt Rule**: After 3 recorded violations, the next infraction (the 4th attempt) triggers a high-priority browser `alert`.
- **Auto-Finalization**: The system calls the backend `finalize` endpoint with a specialized `forced_status: "N/A"` payload.
- **Hard Redirect**: The user is immediately removed from the interview room and redirected to a "Session Terminated" scorecard.

---
*Algorithm v3.0 - Security Hardening implemented on 2026-03-27*
