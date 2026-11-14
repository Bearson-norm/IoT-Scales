' Start IoT Scales V2 server without showing a console window
Option Explicit

Dim shell, fso, appDir, exePath, port

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
exePath = appDir & "\IoT-scales-V2.exe"
port = "3001"

If Not fso.FileExists(exePath) Then
  MsgBox "IoT-scales-V2.exe not found in:" & vbCrLf & appDir, vbCritical, "IoT Scales V2"
  WScript.Quit 1
End If

shell.CurrentDirectory = appDir
' WindowStyle 0 = hidden (no terminal)
shell.Run """" & exePath & """", 0, False

' Server auto-opens browser; short wait then open URL if still needed
WScript.Sleep 2500
shell.Run "http://localhost:" & port & "/", 1, False
