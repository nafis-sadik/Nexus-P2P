# Nexus P2P

A WebRTC Peer-to-Peer communication app with Chat, Video, Screen Sharing, and Gemini AI integration.

## How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Setup Environment**:
    Create a file named `.env` in the root directory and add your Google Gemini API Key:
    ```
    API_KEY=your_actual_api_key_here
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

4.  **Open in Browser**:
    Visit `http://localhost:5173`

## Features

*   **P2P Video/Voice**: Uses PeerJS (WebRTC) for direct browser-to-browser calls.
*   **Screen Sharing**: Toggle between camera and screen share.
*   **Secure Chat**: Direct peer-to-peer data connection.
*   **File Sharing**: Send files directly to peers (size limit ~500KB for stability).
*   **AI Integration**: Uses Gemini Flash 2.5 for Smart Replies and Conversation Summaries.
