@echo off
chcp 65001 >nul
REM ===================================
REM Git Push Script for BLR TOLL
REM ===================================

cls
echo.
echo ======================================
echo   BLR TOLL - GitHub Push Script
echo ======================================
echo.

REM Sjekk om vi er i riktig mappe
if not exist "package.json" (
    if not exist "client\package.json" (
        echo FEIL: Finner ikke package.json
        echo Dette scriptet må kjøres fra BLR_TOLL mappen
        echo.
        pause
        exit /b 1
    )
)

echo [1/5] Sjekker Git status...
echo.
git status
echo.

echo ======================================
echo   Filer som vil bli endret:
echo ======================================
git status --short
echo.

set /p CONTINUE="Vil du fortsette? (J/N): "
if /i not "%CONTINUE%"=="J" (
    echo Avbrutt av bruker
    pause
    exit /b 0
)

echo.
echo [2/5] Legger til alle endringer...
git add .
echo OK!

echo.
echo [3/5] Commit melding
set /p COMMIT_MSG="Skriv commit melding (eller trykk Enter for standard): "

if "%COMMIT_MSG%"=="" (
    set "COMMIT_MSG=Oppdatert ProductSearch med kolonneoverskrifter"
)

echo.
echo Committer med melding: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"

if errorlevel 1 (
    echo.
    echo FEIL: Commit feilet!
    echo Mulige årsaker:
    echo - Ingen endringer å committe
    echo - Git er ikke konfigurert riktig
    echo.
    pause
    exit /b 1
)

echo OK!

echo.
echo [4/5] Henter siste endringer fra GitHub...
git pull origin main

if errorlevel 1 (
    echo.
    echo Prøver med master branch i stedet...
    git pull origin master
)

echo OK!

echo.
echo [5/5] Pusher til GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo Prøver med master branch i stedet...
    git push origin master
    if errorlevel 1 (
        echo.
        echo FEIL: Push feilet!
        echo.
        echo Mulige løsninger:
        echo 1. Sjekk at du har riktig tilgang til repository
        echo 2. Sjekk at du er logget inn i Git
        echo 3. Kjør: git config --global user.name "Ditt Navn"
        echo 4. Kjør: git config --global user.email "din@epost.no"
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ======================================
echo   SUCCESS! Endringene er på GitHub
echo ======================================
echo.
echo Repository: https://github.com/mortenskoglunn/BLR_TOLL
echo.
pause