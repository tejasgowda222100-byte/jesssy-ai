Add-Type -AssemblyName System.Speech

$siteUrl = "https://jesssy-ai.onrender.com/"
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
$recognizer.SetInputToDefaultAudioDevice()

$global:JessyWakeLastLaunch = [DateTime]::MinValue
$global:JessyWakeCooldown = [TimeSpan]::FromSeconds(8)

Write-Host "Hey Jessy is listening. Say 'Hey Jessy' to open JESSY AI. Press Ctrl+C to stop."

$subscription = Register-ObjectEvent -InputObject $recognizer -EventName SpeechRecognized -Action {
    $result = $Event.SourceEventArgs.Result
    $spoken = $result.Text.Trim()
    $confidence = $result.Confidence
    $wakePhrase = '(?i)^hey\s+jess(?:y|ie)\b'

    if ($confidence -lt 0.65 -or $spoken -notmatch $wakePhrase) {
        return
    }

    $now = [DateTime]::UtcNow
    if (($now - $global:JessyWakeLastLaunch) -lt $global:JessyWakeCooldown) {
        return
    }

    $global:JessyWakeLastLaunch = $now
    Start-Process "https://jesssy-ai.onrender.com/"
    Write-Host "Opened JESSY AI after hearing: $spoken"
} | Out-Null

$recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
try {
    while ($true) {
        Wait-Event -Timeout 1 | Out-Null
    }
}
finally {
    $recognizer.RecognizeAsyncCancel()
    $recognizer.Dispose()
    Unregister-Event -SubscriptionId $subscription.Id -ErrorAction SilentlyContinue
    Remove-Variable JessyWakeLastLaunch, JessyWakeCooldown -Scope Global -ErrorAction SilentlyContinue
}
