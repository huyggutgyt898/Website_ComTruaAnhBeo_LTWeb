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

function Read-HiddenValue([string]$prompt) {
    $secureValue = Read-Host $prompt -AsSecureString
    $valuePointer = [IntPtr]::Zero
    try {
        $valuePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($valuePointer).Trim()
    }
    finally {
        if ($valuePointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($valuePointer)
        }
        $secureValue.Dispose()
    }
}

$apiKey = Read-HiddenValue "New Lalamove sandbox API key"
$apiSecret = Read-HiddenValue "New Lalamove sandbox API secret"
$openRouteServiceKey = Read-HiddenValue "New OpenRouteService API key"
$storeName = Read-Host "Store pickup contact name"
$storePhone = Read-HiddenValue "Store pickup contact phone"

if ([string]::IsNullOrWhiteSpace($apiKey) -or
    [string]::IsNullOrWhiteSpace($apiSecret) -or
    [string]::IsNullOrWhiteSpace($openRouteServiceKey) -or
    [string]::IsNullOrWhiteSpace($storeName) -or
    [string]::IsNullOrWhiteSpace($storePhone)) {
    throw "All API keys and the store pickup contact are required. No settings were saved."
}

if (-not $apiKey.StartsWith("pk_test", [StringComparison]::OrdinalIgnoreCase) -or
    -not $apiSecret.StartsWith("sk_test", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Lalamove sandbox credentials must use a Public Key starting with pk_test and a Secret Key starting with sk_test. No settings were saved."
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

foreach ($key in @(
    "Lalamove:ApiKey",
    "Lalamove:ApiSecret",
    "Lalamove:BaseUrl",
    "Lalamove:Market",
    "Lalamove:ServiceType",
    "Lalamove:Language",
    "OpenRouteService:ApiKey",
    "OpenRouteService:BaseUrl",
    "CuaHang:Ten",
    "CuaHang:Sdt"
)) {
    $secrets.PSObject.Properties.Remove($key)
}

$secrets | Add-Member -MemberType NoteProperty -Name Lalamove -Value ([pscustomobject]@{
    ApiKey = $apiKey
    ApiSecret = $apiSecret
    BaseUrl = "https://rest.sandbox.lalamove.com"
    Market = "VN"
    ServiceType = "MOTORCYCLE"
    Language = "vi_VN"
}) -Force

$secrets | Add-Member -MemberType NoteProperty -Name OpenRouteService -Value ([pscustomobject]@{
    ApiKey = $openRouteServiceKey
    BaseUrl = "https://api.openrouteservice.org"
}) -Force

$secrets | Add-Member -MemberType NoteProperty -Name CuaHang -Value ([pscustomobject]@{
    Ten = $storeName.Trim()
    Sdt = $storePhone
}) -Force

$json = ConvertTo-Json -InputObject $secrets -Depth 20
[System.IO.File]::WriteAllText(
    $secretsPath,
    $json,
    [System.Text.UTF8Encoding]::new($false))

$apiKey = $null
$apiSecret = $null
$openRouteServiceKey = $null
$storeName = $null
$storePhone = $null
$secrets = $null
$json = $null

Write-Output "Delivery API settings saved to this project's User Secrets. Stop and restart the app."
