@echo off
chcp 65001 >nul
title PCIe 6.0 学习系统 - 本地服务
cd /d "%~dp0"

echo ============================================
echo   PCIe 6.0 学习系统 - 启动本地服务
echo ============================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    set "PYCMD=py -3"
    goto :run
)
where python >nul 2>nul
if %errorlevel%==0 (
    set "PYCMD=python"
    goto :run
)

echo [!] 没有找到 Python。
echo     - 单机使用：直接双击 index.html 即可，不需要本脚本。
echo     - 手机访问：请先安装 Python https://www.python.org/downloads/
echo     （安装时勾选 Add python.exe to PATH）
echo.
pause
exit /b 1

:run
echo 正在启动服务（端口 8000）...
echo.
echo 手机与电脑连同一个 WiFi，用手机浏览器访问下面的任意地址：
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=* delims= " %%b in ("%%a") do echo     http://%%b:8000
)
echo.
echo 本机访问：      http://localhost:8000
echo.
echo 关闭本窗口即停止服务。首次访问如弹出防火墙提示，请允许。
echo.
start "" http://localhost:8000
%PYCMD% -m http.server 8000
pause
