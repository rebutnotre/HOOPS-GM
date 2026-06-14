$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Basketball GM.lnk")
$Shortcut.TargetPath = "C:\Users\Admin\basketball-gm\play.bat"
$Shortcut.WorkingDirectory = "C:\Users\Admin\basketball-gm"
$Shortcut.WindowStyle = 7  # minimized — keeps the terminal out of the way
$Shortcut.Description = "Launch Basketball GM"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,16"  # trophy/star icon
$Shortcut.Save()
Write-Host "Shortcut created on Desktop as 'Basketball GM'" -ForegroundColor Green
