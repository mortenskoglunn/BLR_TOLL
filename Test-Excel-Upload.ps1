# Test Excel Upload Script for BLR TOLL
param(
    [string]$ExcelFile = "",
    [string]$Token = ""
)

$API_BASE = "http://localhost:5000"

# Funksjoner
function Get-AuthToken {
    param([string]$Username = "admin", [string]$Password = "admin123")
    
    Write-Host "🔐 Henter authentication token..." -ForegroundColor Yellow
    
    $loginBody = @{
        username = $Username
        password = $Password
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
        if ($response.success) {
            Write-Host "✅ Token hentet for bruker: $($response.user.username)" -ForegroundColor Green
            return $response.token
        } else {
            throw "Login feilet: $($response.message)"
        }
    } catch {
        Write-Host "❌ Login feil: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Test-ExcelUpload {
    param([string]$FilePath, [string]$AuthToken)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ Filen finnes ikke: $FilePath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "📊 Laster opp Excel-fil: $(Split-Path $FilePath -Leaf)" -ForegroundColor Yellow
    Write-Host "   Filstørrelse: $([math]::Round((Get-Item $FilePath).Length / 1KB, 2)) KB"
    
    # PowerShell 7+ method (modern)
    if ($PSVersionTable.PSVersion.Major -ge 7) {
        try {
            $form = @{
                excelFile = Get-Item $FilePath
            }
            $response = Invoke-RestMethod -Uri "$API_BASE/api/upload/excel" -Method POST -Form $form -Headers @{"Authorization" = "Bearer $AuthToken"}
            return $response
        } catch {
            # Fallback til eldre metode hvis Form ikke fungerer
        }
    }
    
    # PowerShell 5.1 / Fallback method
    try {
        # Bruk .NET classes for multipart upload
        Add-Type -AssemblyName System.Net.Http
        
        $httpClient = New-Object System.Net.Http.HttpClient
        $httpClient.DefaultRequestHeaders.Add("Authorization", "Bearer $AuthToken")
        
        $multipartContent = New-Object System.Net.Http.MultipartFormDataContent
        
        $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
        $fileContent = New-Object System.Net.Http.ByteArrayContent -ArgumentList @(,$fileBytes)
        $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        
        $multipartContent.Add($fileContent, "excelFile", (Split-Path $FilePath -Leaf))
        
        $response = $httpClient.PostAsync("$API_BASE/api/upload/excel", $multipartContent).Result
        $responseContent = $response.Content.ReadAsStringAsync().Result
        
        $httpClient.Dispose()
        $multipartContent.Dispose()
        
        if ($response.IsSuccessStatusCode) {
            return $responseContent | ConvertFrom-Json
        } else {
            throw "HTTP $($response.StatusCode): $responseContent"
        }
    } catch {
        Write-Host "❌ Upload feil: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Create-TestExcelFile {
    param([string]$OutputPath = "C:\BLR_Toll\test-data.xlsx")
    
    Write-Host "📋 Oppretter test Excel-fil..." -ForegroundColor Yellow
    
    # Bruk Excel COM object hvis tilgjengelig
    try {
        $excel = New-Object -ComObject Excel.Application
        $excel.Visible = $false
        $workbook = $excel.Workbooks.Add()
        $worksheet = $workbook.Worksheets.Item(1)
        
        # Headers
        $worksheet.Cells.Item(1, 1) = "Blomst"
        $worksheet.Cells.Item(1, 2) = "Antall"
        $worksheet.Cells.Item(1, 3) = "Kommentar"
        $worksheet.Cells.Item(1, 4) = "Opprinnelse"
        
        # Test data
        $testData = @(
            @("Rose", 10, "Røde roser", "Nederland"),
            @("Tulipan", 25, "Gule tulipaner", "Holland"),
            @("Nellik", 15, "Hvite nellik", "Colombia"),
            @("Solsikke", 5, "Store solsikker", "Kenya"),
            @("Orkidé", 8, "Lilla orkideer", "Thailand"),
            @("Ukjent_blomst", 3, "Ny blomsttype", "Norge")
        )
        
        for ($i = 0; $i -lt $testData.Length; $i++) {
            for ($j = 0; $j -lt $testData[$i].Length; $j++) {
                $worksheet.Cells.Item($i + 2, $j + 1) = $testData[$i][$j]
            }
        }
        
        # Style headers
        $headerRange = $worksheet.Range("A1:D1")
        $headerRange.Font.Bold = $true
        $headerRange.Interior.Color = 15773696 # Light blue
        
        # Auto-fit columns
        $worksheet.UsedRange.Columns.AutoFit() | Out-Null
        
        # Save and close
        $workbook.SaveAs($OutputPath, 51) # xlOpenXMLWorkbook format
        $workbook.Close()
        $excel.Quit()
        
        # Release COM objects
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($worksheet) | Out-Null
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
        
        Write-Host "✅ Test Excel-fil opprettet: $OutputPath" -ForegroundColor Green
        return $OutputPath
        
    } catch {
        Write-Host "⚠️  Excel COM ikke tilgjengelig, oppretter CSV i stedet..." -ForegroundColor Yellow
        
        # Fallback: Opprett CSV som kan testes
        $csvPath = $OutputPath -replace "\.xlsx$", ".csv"
        $testDataCsv = @"
Blomst,Antall,Kommentar,Opprinnelse
Rose,10,Røde roser,Nederland
Tulipan,25,Gule tulipaner,Holland
Nellik,15,Hvite nellik,Colombia
Solsikke,5,Store solsikker,Kenya
Orkidé,8,Lilla orkideer,Thailand
Ukjent_blomst,3,Ny blomsttype,Norge
"@
        
        $testDataCsv | Out-File -FilePath $csvPath -Encoding UTF8
        Write-Host "✅ Test CSV-fil opprettet: $csvPath" -ForegroundColor Green
        Write-Host "💡 Konverter denne til Excel (.xlsx) i Excel for å teste upload" -ForegroundColor Cyan
        return $csvPath
    }
}

# Main script
Write-Host "🚀 BLR TOLL Excel Upload Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Hent token hvis ikke oppgitt
if (-not $Token) {
    $Token = Get-AuthToken
    if (-not $Token) {
        Write-Host "❌ Kunne ikke hente authentication token" -ForegroundColor Red
        exit 1
    }
}

# Finn eller opprett Excel-fil
if (-not $ExcelFile) {
    $possibleFiles = @(
        "C:\BLR_Toll\test-data.xlsx",
        "C:\BLR_Toll\*.xlsx",
        "C:\Users\$env:USERNAME\Desktop\*.xlsx",
        "C:\Users\$env:USERNAME\Downloads\*.xlsx"
    )
    
    $foundFile = $null
    foreach ($pattern in $possibleFiles) {
        $files = Get-ChildItem $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($files) {
            $foundFile = $files.FullName
            break
        }
    }
    
    if ($foundFile) {
        $ExcelFile = $foundFile
        Write-Host "📁 Fant Excel-fil: $ExcelFile" -ForegroundColor Green
    } else {
        Write-Host "📋 Ingen Excel-fil funnet. Oppretter test-fil..." -ForegroundColor Yellow
        $ExcelFile = Create-TestExcelFile
    }
}

# Test upload
Write-Host ""
$result = Test-ExcelUpload -FilePath $ExcelFile -AuthToken $Token

if ($result) {
    Write-Host "✅ Excel upload vellykket!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Resultat:" -ForegroundColor Cyan
    Write-Host "   Fil: $($result.file.originalName)" -ForegroundColor White
    Write-Host "   Størrelse: $($result.file.size) bytes" -ForegroundColor White
    Write-Host "   Ark: $($result.parsing.totalSheets)" -ForegroundColor White
    Write-Host "   Rader: $($result.parsing.totalRows)" -ForegroundColor White
    
    if ($result.worksheets) {
        Write-Host ""
        Write-Host "📋 Arbeidsark detaljer:" -ForegroundColor Cyan
        foreach ($sheet in $result.worksheets) {
            Write-Host "   - $($sheet.name): $($sheet.rowCount) rader, $($sheet.columnCount) kolonner" -ForegroundColor White
            if ($sheet.headers) {
                Write-Host "     Headers: $($sheet.headers -join ', ')" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Write-Host "🎯 Neste steg:" -ForegroundColor Cyan
    Write-Host "   1. Test database søk på blomster-navnene" -ForegroundColor White
    Write-Host "   2. Implementer Vue.js frontend" -ForegroundColor White
    Write-Host "   3. Test full workflow" -ForegroundColor White
    
} else {
    Write-Host "❌ Excel upload feilet" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Feilsøking:" -ForegroundColor Cyan
    Write-Host "   1. Kontroller at serveren kjører: npm run dev" -ForegroundColor White
    Write-Host "   2. Sjekk at filen er en gyldig Excel-fil (.xlsx)" -ForegroundColor White
    Write-Host "   3. Test med en mindre fil" -ForegroundColor White
    Write-Host "   4. Sjekk server-logs for detaljer" -ForegroundColor White
}

Write-Host ""
Write-Host "🏁 Test fullført" -ForegroundColor Cyan