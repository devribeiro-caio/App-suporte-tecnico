$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\formi\Desktop\Logo Formis.png'
$pngPath = 'C:\Users\formi\Desktop\chamados-suporte\electron\icon.png'
$icoPath = 'C:\Users\formi\Desktop\chamados-suporte\electron\icon.ico'
$shortcutPath = 'C:\Users\formi\Desktop\Sistema de Suporte Técnico.lnk'

function New-IcoDib([int]$size, [System.Drawing.Bitmap]$source) {
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
    $graphics.Dispose()

    $xor = New-Object byte[] ($size * $size * 4)
    $position = 0
    for ($row = $size - 1; $row -ge 0; $row--) {
        for ($column = 0; $column -lt $size; $column++) {
            $pixel = $bitmap.GetPixel($column, $row)
            $xor[$position++] = $pixel.B
            $xor[$position++] = $pixel.G
            $xor[$position++] = $pixel.R
            $xor[$position++] = $pixel.A
        }
    }
    $bitmap.Dispose()

    $maskStride = [int]([Math]::Ceiling($size / 32.0) * 4)
    $andMask = New-Object byte[] ($maskStride * $size)
    $stream = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter($stream)
    $writer.Write([UInt32]40)
    $writer.Write([Int32]$size)
    $writer.Write([Int32]($size * 2))
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]0)
    $writer.Write([UInt32]$xor.Length)
    $writer.Write([Int32]0)
    $writer.Write([Int32]0)
    $writer.Write([UInt32]0)
    $writer.Write([UInt32]0)
    $writer.Write([byte[]]$xor)
    $writer.Write([byte[]]$andMask)
    $writer.Flush()
    $bytes = $stream.ToArray()
    $writer.Dispose()
    $stream.Dispose()
    return ,$bytes
}

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
    $images = @()
    foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
        $images += ,[pscustomobject]@{ Size = $size; Bytes = (New-IcoDib $size $source) }
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

# Confirm Windows can decode the ICO before pointing the shortcut to it.
$testIcon = [System.Drawing.Icon]::new($icoPath)
$testIconSize = "$($testIcon.Width)x$($testIcon.Height)"
$testIcon.Dispose()

# Keep the shortcut target intact and update only its icon source.
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$targetBefore = $shortcut.TargetPath
$shortcut.IconLocation = "$icoPath,0"
$shortcut.Save()
$verified = $shell.CreateShortcut($shortcutPath)
if ($verified.TargetPath -ne $targetBefore) { throw 'O destino do atalho foi alterado.' }
if ($verified.IconLocation -notlike '*electron\icon.ico,0') { throw 'O novo ícone não foi salvo no atalho.' }

# Notify Explorer that this specific shortcut changed, then refresh associations.
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class FormisShellRefresh {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(uint eventId, uint flags, IntPtr item1, IntPtr item2);
}
'@
$pathPointer = [Runtime.InteropServices.Marshal]::StringToHGlobalUni($shortcutPath)
try { [FormisShellRefresh]::SHChangeNotify(0x00002000, 0x0005, $pathPointer, [IntPtr]::Zero) }
finally { [Runtime.InteropServices.Marshal]::FreeHGlobal($pathPointer) }
[FormisShellRefresh]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)

[pscustomobject]@{
    IconPath = $icoPath
    IconDimensionsDecodedByWindows = $testIconSize
    ShortcutPath = $shortcutPath
    ShortcutTargetPreserved = $verified.TargetPath
    ShortcutIcon = $verified.IconLocation
    IconFileBytes = (Get-Item $icoPath).Length
} | Format-List
