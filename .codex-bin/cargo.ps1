param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Rest
)

function Quote-Sh([string]$Value) {
  $separator = [string]([char]39) + '"' + [char]39 + '"' + [char]39
  return "'" + (($Value -split "'", -1) -join $separator) + "'"
}

$windowsPath = (Get-Location).Path
$drive = $windowsPath.Substring(0, 1).ToLowerInvariant()
$tail = $windowsPath.Substring(2).Replace('\', '/')
$wslPath = "/mnt/$drive$tail"
$quotedArgs = $Rest | ForEach-Object { Quote-Sh $_ }
$command = @(
  'source "$HOME/.cargo/env" >/dev/null 2>&1'
  "cd $(Quote-Sh $wslPath)"
  "cargo $($quotedArgs -join ' ')"
) -join '; '

wsl.exe -d Debian sh -lc $command
exit $LASTEXITCODE
