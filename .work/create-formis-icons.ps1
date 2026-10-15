$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sourcePath = 'C:\Users\formi\Desktop\Logo Formis.png'
$pngPath = 'C:\Users\formi\Desktop\chamados-suporte\electron\icon.png'
$icoPath = 'C:\Users\formi\Desktop\chamados-suporte\electron\icon.ico'

function New-LogoPng([int]$size, [System.Drawing.Bitmap]$source) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $scale = [Math]::Min(($size * 0.9) / $source.Width, ($size * 0.9) / $source.Height)
    $width = [int][Math]::Round($source.Width * $scale)
    $height = [int][Math]::Round($source.Height * $scale)
    $x = [int][Math]::Floor(($size - $width) / 2)
    $y = [int][Math]::Floor(($size - $height) / 2)
    $graphics.DrawImage($source, $x, $y, $width, $height)
    $memory = New-Object System.IO.MemoryStream
    $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $memory.ToArray()
    $memory.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
    return ,$bytes
}

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
    $mainBytes = New-LogoPng 512 $source
    [System.IO.File]::WriteAllBytes($pngPath, $mainBytes)

    $images = @()
    foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
        $images += ,[pscustomobject]@{ Size = $size; Bytes = (New-LogoPng $size $source) }
    }

    $output = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    try {
        $writer = New-Object System.IO.BinaryWriter($output)
        $writer.Write([UInt16]0)
        $writer.Write([UInt16]1)
        $writer.Write([UInt16]$images.Count)
        $offset = 6 + 16 * $images.Count
        foreach ($image in $images) {
            $dimension = if ($image.Size -eq 256) { 0 } else { [byte]$image.Size }
            $writer.Write([byte]$dimension)
            $writer.Write([byte]$dimension)
            $writer.Write([byte]0)
            $writer.Write([byte]0)
            $writer.Write([UInt16]1)
            $writer.Write([UInt16]32)
            $writer.Write([UInt32]$image.Bytes.Length)
            $writer.Write([UInt32]$offset)
            $offset += $image.Bytes.Length
        }
        foreach ($image in $images) { $writer.Write([byte[]]$image.Bytes) }
        $writer.Flush()
        $writer.Dispose()
    }
    finally { $output.Dispose() }
}
finally { $source.Dispose() }

$checkPng = [System.Drawing.Bitmap]::FromFile($pngPath)
try {
    $icoBytes = [System.IO.File]::ReadAllBytes($icoPath)
    if ($checkPng.Width -ne 512 -or $checkPng.Height -ne 512 -or $icoBytes[0] -ne 0 -or $icoBytes[2] -ne 1 -or $icoBytes[4] -ne 7) {
        throw 'Validação de PNG/ICO falhou.'
    }
}
finally { $checkPng.Dispose() }
Get-Item $pngPath, $icoPath | Select-Object FullName, Length
