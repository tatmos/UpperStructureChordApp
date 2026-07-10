@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo ========================================
echo  アッパーストラクチャー・コード組み合わせ
echo  開発サーバーを起動します
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [エラー] Node.js が見つかりません。
  echo https://nodejs.org/ からインストールしてください。
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [エラー] npm が見つかりません。
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo 初回起動のため依存パッケージをインストールしています...
  call npm install
  if errorlevel 1 (
    echo [エラー] npm install に失敗しました。
    pause
    exit /b 1
  )
  echo.
)

echo ブラウザで http://localhost:5173/UpperStructureChordApp/ を開いてください。
echo 停止するには Ctrl+C を押してください。
echo.

call npm run dev

if errorlevel 1 (
  echo.
  echo [エラー] 開発サーバーの起動に失敗しました。
  pause
  exit /b 1
)

endlocal
