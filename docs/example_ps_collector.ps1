$profiles = Get-ChildItem -Path "C:\Users" -Directory
$outputFilePath = "C:\Program Files\windows_exporter\textfile_inputs\disk_usage_metrics.prom"

if (-not (Test-Path -Path $outputFilePath)) {
    New-Item -ItemType File -Path $outputFilePath -Force
}

Clear-Content -Path $outputFilePath

foreach ($profile in $profiles) {
    $profileName = $profile.Name
    $profilePath = $profile.FullName
    Write-Host "Processing profile: $profileName"
    
    $files = Get-ChildItem -Path $profilePath -Recurse
    if ($files.Count -gt 0) {
        $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
        $metric = "disk_usage_bytes{user_profile=`"$profileName`"} $totalSize"
        Add-Content -Path $outputFilePath -Value $metric
    } else {
        Write-Host "No files found in profile: $profileName"
    }
}
