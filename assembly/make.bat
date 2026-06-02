@echo off
echo Loading Visual Studio Compiler Environment...
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars32.bat" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Could not load Visual Studio environment.
    goto error
)

echo Compiling Assembly Code...
ml.exe /c /Zd /coff /I"C:\Irvine" typex_engine.asm
if errorlevel 1 (
    echo [ERROR] Assembly compilation failed.
    goto error
)

echo Linking Executable...
link.exe /subsystem:console /libpath:"C:\Irvine" typex_engine.obj Irvine32.lib kernel32.lib user32.lib /OUT:typex_engine.exe
if errorlevel 1 (
    echo [ERROR] Linking failed.
    goto error
)

echo Copying Executable to Backend...
copy /Y typex_engine.exe ..\backend\typex_engine.exe
if errorlevel 1 (
    echo [ERROR] Copying executable to backend failed.
    goto error
)

echo Build Successful!
exit /b 0

:error
echo Build Failed!
exit /b 1
