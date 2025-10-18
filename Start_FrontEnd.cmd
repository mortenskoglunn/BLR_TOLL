@echo off
REM ============================================================================
REM BLR TOLL SYSTEM - Start Frontend
REM ============================================================================
REM Dette scriptet starter Vue.js frontend utviklingsserveren med npm
REM ============================================================================

echo.
echo ========================================
echo  BLR TOLL SYSTEM - Frontend Starter
echo ========================================
echo.

REM Sett npm som foretrukket pakkebehandler
set npm_config_prefer_yarn=false

REM Sjekk om client-mappen eksisterer
if not exist "client\" (
    echo [FEIL] Client-mappen finnes ikke!
    echo Sjekk at du kjorer scriptet fra BLR_Toll root-mappen.
    pause
    exit /b 1
)

REM Gå til client-mappen
cd client

REM Sjekk om yarn.lock eksisterer og fjern den
if exist "yarn.lock" (
    echo [INFO] Fjerner yarn.lock - bruker npm i stedet...
    del yarn.lock
    echo [OK] yarn.lock fjernet
    echo.
)

REM Sjekk om node_modules eksisterer
if not exist "node_modules\" (
    echo [INFO] node_modules finnes ikke - installerer avhengigheter med npm...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [FEIL] Kunne ikke installere avhengigheter!
        cd ..
        pause
        exit /b 1
    )
    echo.
    echo [OK] Avhengigheter installert med npm!
    echo.
)

REM Start Vue.js utviklingsserver med npm
echo [INFO] Starter Vue.js utviklingsserver med npm...
echo.
echo ========================================
echo  Frontend informasjon:
echo ========================================
echo  URL: http://localhost:8080
echo  Pakkebehandler: npm
echo.
echo  Trykk Ctrl+C for a stoppe serveren
echo ========================================
echo.

call npm run serve

REM Gå tilbake til root-mappen
cd ..

pause