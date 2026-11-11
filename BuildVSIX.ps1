<#
.SYNOPSIS
    Builds the VS Code extension .vsix package for c-comment-fold-helper.

.DESCRIPTION
    Compiles TypeScript source code to JavaScript and packages the extension
    into a distributable .vsix archive in the repository root directory.

.PARAMETER Install
    If specified, automatically installs the built .vsix into VS Code after packaging.

.EXAMPLE
    .\BuildVSIX.ps1
    .\BuildVSIX.ps1 -Install
#>

[CmdletBinding()]
param (
    [switch]$Install
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building VS Code Extension VSIX Package  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Read package.json metadata
$packageJsonPath = Join-Path $ScriptDir "package.json"
if (-not (Test-Path $packageJsonPath)) {
    throw "package.json not found at $packageJsonPath"
}

$packageJson = Get-Content $packageJsonPath -Raw -Encoding utf8 | ConvertFrom-Json
$extName = $packageJson.name
$extVersion = $packageJson.version
$extPublisher = $packageJson.publisher
$extDisplayName = $packageJson.displayName
$extDescription = $packageJson.description
$vsixFileName = "$extName-$extVersion.vsix"
$vsixOutputPath = Join-Path $ScriptDir $vsixFileName

Write-Host "[1/4] Reading package.json:" -ForegroundColor Green
Write-Host "      Extension : $extDisplayName ($extName)"
Write-Host "      Version   : $extVersion"
Write-Host "      Publisher : $extPublisher"
Write-Host "      Target    : $vsixFileName"

# 2. Compile TypeScript
Write-Host "[2/4] Compiling TypeScript source..." -ForegroundColor Green
$outDir = Join-Path $ScriptDir "out"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$tscCmd = Get-Command "tsc" -ErrorAction SilentlyContinue
$compiled = $false

if ($tscCmd) {
    Write-Host "      Using system tsc compiler..."
    & tsc -p ./
    if ($LASTEXITCODE -eq 0) { $compiled = $true }
}

if (-not $compiled) {
    # Fallback to bundled TypeScript in VS Code installation
    $vsCodeExe = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\Code.exe"
    $tsLibGlob = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code") -Recurse -Filter "typescript.js" -ErrorAction SilentlyContinue | Select-Object -First 1

    if ((Test-Path $vsCodeExe) -and $tsLibGlob) {
        Write-Host "      Compiling via VS Code runtime and TypeScript engine..."
        $tsLibPath = $tsLibGlob.FullName.Replace('\', '/')
        $compileScript = @"
const ts = require('$tsLibPath');
const fs = require('fs');
const path = require('path');
const srcFile = path.resolve('src/extension.ts');
const source = fs.readFileSync(srcFile, 'utf8');
const result = ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        sourceMap: true
    }
});
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/extension.js', result.outputText);
if (result.sourceMapText) {
    fs.writeFileSync('out/extension.js.map', result.sourceMapText);
}
"@
        $env:ELECTRON_RUN_AS_NODE = "1"
        & $vsCodeExe -e $compileScript
        $env:ELECTRON_RUN_AS_NODE = $null
        $compiled = $true
    }
}

if (-not (Test-Path (Join-Path $outDir "extension.js"))) {
    throw "Compilation failed: out/extension.js was not generated."
}
Write-Host "      Compiled out/extension.js successfully."

# 3. Stage package contents
Write-Host "[3/4] Packaging VSIX structure..." -ForegroundColor Green
$tempDir = Join-Path $env:TEMP ("vsix_stage_" + [Guid]::NewGuid().ToString())
$stageExt = Join-Path $tempDir "extension"
$stageOut = Join-Path $stageExt "out"

New-Item -ItemType Directory -Path $stageOut -Force | Out-Null

Copy-Item (Join-Path $ScriptDir "package.json") (Join-Path $stageExt "package.json")
if (Test-Path (Join-Path $ScriptDir "README.md")) {
    Copy-Item (Join-Path $ScriptDir "README.md") (Join-Path $stageExt "README.md")
}
Copy-Item (Join-Path $outDir "extension.js") (Join-Path $stageOut "extension.js")
if (Test-Path (Join-Path $outDir "extension.js.map")) {
    Copy-Item (Join-Path $outDir "extension.js.map") (Join-Path $stageOut "extension.js.map")
}

# [Content_Types].xml
$contentTypesXml = @"
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="vsixmanifest" ContentType="text/xml"/>
	<Default Extension="json" ContentType="application/json"/>
	<Default Extension="md" ContentType="text/markdown"/>
	<Default Extension="js" ContentType="application/javascript"/>
	<Default Extension="map" ContentType="application/json"/>
</Types>
"@
[System.IO.File]::WriteAllText((Join-Path $tempDir "[Content_Types].xml"), $contentTypesXml, [System.Text.Encoding]::UTF8)

# extension.vsixmanifest
$keywords = if ($packageJson.keywords) { ($packageJson.keywords -join ',') } else { "c,cpp,doxygen,fold,preview" }
$categories = if ($packageJson.categories) { ($packageJson.categories -join ',') } else { "Programming Languages,Other" }
$repoUrl = if ($packageJson.repository -and $packageJson.repository.url) { $packageJson.repository.url } else { "" }

$manifestXml = @"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
	<Metadata>
		<Identity Language="en-US" Id="$extName" Version="$extVersion" Publisher="$extPublisher" />
		<DisplayName>$extDisplayName</DisplayName>
		<Description xml:space="preserve">$extDescription</Description>
		<Tags>$keywords</Tags>
		<Categories>$categories</Categories>
		<GalleryFlags>Public</GalleryFlags>
		<Properties>
			<Property Id="Microsoft.VisualStudio.Code.Engine" Value="$($packageJson.engines.vscode)" />
			<Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
			<Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
			<Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace" />
			<Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="" />
			<Property Id="Microsoft.VisualStudio.Code.EnabledApiProposals" Value="" />
			<Property Id="Microsoft.VisualStudio.Code.ExecutesCode" Value="true" />
			<Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="$repoUrl" />
			<Property Id="Microsoft.VisualStudio.Services.Links.Getstarted" Value="$repoUrl" />
			<Property Id="Microsoft.VisualStudio.Services.Links.GitHub" Value="$repoUrl" />
			<Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="$repoUrl/issues" />
			<Property Id="Microsoft.VisualStudio.Services.Links.Learn" Value="$repoUrl" />
			<Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="true" />
			<Property Id="Microsoft.VisualStudio.Services.Content.Pricing" Value="Free"/>
		</Properties>
	</Metadata>
	<Installation>
		<InstallationTarget Id="Microsoft.VisualStudio.Code"/>
	</Installation>
	<Dependencies/>
	<Assets>
		<Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
		<Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
	</Assets>
</PackageManifest>
"@
[System.IO.File]::WriteAllText((Join-Path $tempDir "extension.vsixmanifest"), $manifestXml, [System.Text.Encoding]::UTF8)

# 4. Create VSIX Archive
if (Test-Path $vsixOutputPath) {
    Remove-Item $vsixOutputPath -Force
}

Add-Type -AssemblyName "System.IO.Compression" -ErrorAction SilentlyContinue
Add-Type -AssemblyName "System.IO.Compression.FileSystem" -ErrorAction SilentlyContinue
$zipFile = [System.IO.Compression.ZipFile]::Open($vsixOutputPath, [System.IO.Compression.ZipArchiveMode]::Create)

Get-ChildItem -Path $tempDir -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($tempDir.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipFile, $_.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}
$zipFile.Dispose()

Remove-Item -Path $tempDir -Recurse -Force

$fileInfo = Get-Item $vsixOutputPath
Write-Host "[4/4] Package built successfully!" -ForegroundColor Green
Write-Host "      File : $($fileInfo.Name)" -ForegroundColor Cyan
Write-Host "      Size : $([Math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Cyan
Write-Host "      Path : $($fileInfo.FullName)" -ForegroundColor Cyan

# 5. Optional Auto-install
if ($Install) {
    Write-Host "`nInstalling extension into VS Code..." -ForegroundColor Yellow
    & code --install-extension $vsixOutputPath --force
}
