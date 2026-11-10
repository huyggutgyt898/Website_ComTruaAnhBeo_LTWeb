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

$secureApiKey = Read-Host "New OpenRouteService API key" -AsSecureString
$apiKeyPointer = [IntPtr]::Zero
try {
    $apiKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureApiKey)
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($apiKeyPointer).Trim()
}
finally {
    if ($apiKeyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($apiKeyPointer)
    }
    $secureApiKey.Dispose()
}

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    throw "The OpenRouteService API key cannot be empty. No settings were saved."
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

$secrets | Add-Member -MemberType NoteProperty -Name OpenRouteService -Value ([pscustomobject]@{
    ApiKey = $apiKey
    BaseUrl = "https://api.openrouteservice.org"
}) -Force

$json = ConvertTo-Json -InputObject $secrets -Depth 20
[System.IO.File]::WriteAllText(
    $secretsPath,
    $json,
    [System.Text.UTF8Encoding]::new($false))

$apiKey = $null
$secrets = $null
$json = $null

Write-Output "OpenRouteService key saved to this project's User Secrets. Stop and restart the app."
