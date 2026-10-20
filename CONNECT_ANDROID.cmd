@echo off
cd /d "%~dp0"
call START_RYLIXS.cmd
C:\Android\platform-tools\adb.exe reverse tcp:3100 tcp:3100
C:\Android\platform-tools\adb.exe install -r dist\RYLIXS-preview.apk
C:\Android\platform-tools\adb.exe shell am start -n com.rylixs.preview/.MainActivity
pause
