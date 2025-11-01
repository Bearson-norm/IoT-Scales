@echo off
echo Starting HTTP Server for Vibra Scale Reader...
echo.
echo Open your browser and go to: http://localhost:8000/vibra-scale-reader.html
echo.
echo Press Ctrl+C to stop the server
echo.
python -m http.server 8000
pause

