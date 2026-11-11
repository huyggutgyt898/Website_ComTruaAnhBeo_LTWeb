$ErrorActionPreference = "Stop"

$projectPath = Join-Path $PSScriptRoot "..\ComTruaAnhBeo.csproj"
if (-not (Test-Path -LiteralPath $projectPath)) {
    throw "ComTruaAnhBeo.csproj was not found."
}

[xml]$project = Get-Content -LiteralPath $projectPath
$userSecretsId = $project.Project.PropertyGroup.UserSecretsId |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -First 1
if ([string]::IsNullOrWhiteSpace($userSecretsId)) {
    throw "The project has no UserSecretsId."
}

$emailAddress = (Read-Host "Gmail address used to send verification codes").Trim()
if ($emailAddress -notmatch '^[^@\s]+@gmail\.com$') {
    throw "Enter a valid Gmail address."
}

$secureAppPassword = Read-Host "Gmail App Password (input is hidden)" -AsSecureString
$passwordPointer = [IntPtr]::Zero
try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureAppPassword)
    $appPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer).Replace(" ", "")
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $secureAppPassword.Dispose()
}

if ([string]::IsNullOrWhiteSpace($appPassword)) {
    throw "The App Password cannot be empty."
}

$secretsDirectory = Join-Path $env:APPDATA "Microsoft\UserSecrets\$userSecretsId"
$secretsPath = Join-Path $secretsDirectory "secrets.json"
New-Item -ItemType Directory -Path $secretsDirectory -Force | Out-Null

$secrets = [pscustomobject]@{}
if (Test-Path -LiteralPath $secretsPath) {
    $existingContent = Get-Content -LiteralPath $secretsPath -Raw
    if (-not [string]::IsNullOrWhiteSpace($existingContent)) {
        $secrets = ConvertFrom-Json -InputObject $existingContent
    }
}

$emailSettings = [pscustomobject]@{
    SmtpHost = "smtp.gmail.com"
    SmtpPort = 587
    EnableSsl = $true
    Username = $emailAddress
    Password = $appPassword
    FromAddress = $emailAddress
    FromName = "Cơm Trưa Anh Béo"
}
$secrets | Add-Member -MemberType NoteProperty -Name Email -Value $emailSettings -Force

$json = ConvertTo-Json -InputObject $secrets -Depth 20
[System.IO.File]::WriteAllText(
    $secretsPath,
    $json,
    [System.Text.UTF8Encoding]::new($false))
$appPassword = $null

Write-Output "SMTP settings saved to this project's User Secrets. Stop and restart the app."
