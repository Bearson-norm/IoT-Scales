' Default launcher shortcut - same as silent start (no console window)
CreateObject("WScript.Shell").Run "wscript.exe """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\Start-IoT-Scales-Silent.vbs""", 0, False
