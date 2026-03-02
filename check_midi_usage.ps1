# Check what processes might be using MIDI devices

Write-Host "`n=== Checking for MIDI-related processes ===" -ForegroundColor Cyan

# Common MIDI/DJ software
$midiProcesses = @(
    "rekordbox", "Serato", "VirtualDJ", "Traktor", "djay", 
    "ASIO", "FL Studio", "Ableton", "MIDIBerry", "loopMIDI",
    "rtpMIDI", "MidiView", "MidiYoke", "python", "node"
)

$found = @()

foreach ($procName in $midiProcesses) {
    $procs = Get-Process -Name "*$procName*" -ErrorAction SilentlyContinue
    if ($procs) {
        foreach ($proc in $procs) {
            $found += [PSCustomObject]@{
                Name = $proc.Name
                Id = $proc.Id
                Path = (Get-Process -Id $proc.Id).Path
            }
        }
    }
}

if ($found.Count -gt 0) {
    Write-Host "`nFound $($found.Count) potential MIDI-using process(es):" -ForegroundColor Yellow
    $found | Format-Table -AutoSize
    
    Write-Host "`nTo free the MIDI device, try closing these applications." -ForegroundColor Yellow
} else {
    Write-Host "`nNo obvious MIDI applications found running." -ForegroundColor Green
    Write-Host "The device might be held by a system service or driver." -ForegroundColor Yellow
}

Write-Host "`n=== Checking browser processes ===" -ForegroundColor Cyan
$browsers = Get-Process -Name "*chrome*", "*msedge*", "*firefox*", "*brave*" -ErrorAction SilentlyContinue
if ($browsers) {
    Write-Host "Found browser processes (Web MIDI might be active):" -ForegroundColor Yellow
    $browsers | Select-Object Name, Id | Format-Table
    Write-Host "Close any browser tabs using Web MIDI API" -ForegroundColor Yellow
}
