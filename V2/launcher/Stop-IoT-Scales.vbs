' Stop IoT Scales V2 server process
Option Explicit

Dim shell, result
Set shell = CreateObject("WScript.Shell")
result = shell.Run "taskkill /F /IM IoT-scales-V2.exe", 0, True

If result = 0 Then
  MsgBox "IoT Scales V2 stopped.", vbInformation, "IoT Scales V2"
Else
  MsgBox "IoT-scales-V2.exe is not running (or could not be stopped).", vbExclamation, "IoT Scales V2"
End If
