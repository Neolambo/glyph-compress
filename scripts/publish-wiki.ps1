param(
  [string]$Owner = "Neolambo",
  [string]$Repository = "glyph-compress",
  [string]$Source = "docs/wiki"
)

$ErrorActionPreference = "Stop"

$sourcePath = Resolve-Path $Source
$wikiRemote = "https://github.com/$Owner/$Repository.wiki.git"
$workPath = Join-Path ([System.IO.Path]::GetTempPath()) "$Repository-wiki-publish"

if (Test-Path $workPath) {
  Remove-Item -Recurse -Force $workPath
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
git ls-remote $wikiRemote HEAD *> $null
$lsRemoteExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference

if ($lsRemoteExitCode -ne 0) {
  Write-Host "GitHub wiki remote is not available yet. Create and save the first wiki page in GitHub, then rerun this script."
  exit 1
}

git clone $wikiRemote $workPath
Get-ChildItem -Path $workPath -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $sourcePath "*") -Destination $workPath -Recurse -Force

Push-Location $workPath
try {
  git config user.name "Neolambo"
  git config user.email "campiossasco1@gmail.com"
  git add .
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -m "Populate GlyphCompress wiki"
    git push origin master
  } else {
    Write-Host "Wiki is already up to date."
  }
} finally {
  Pop-Location
}
