# Generate PWA icons: indigo background + amber lightning bolt (512 / 192)
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing

function New-Icon {
    param([int]$Size, [string]$Path)
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(79, 70, 229))
    $g.FillRectangle($bg, 0, 0, $Size, $Size)

    # Bolt polygon (normalized coords, inside center safe area for maskable)
    $norm = @(
        @(0.60, 0.06), @(0.24, 0.56), @(0.47, 0.56),
        @(0.41, 0.94), @(0.77, 0.44), @(0.54, 0.44), @(0.70, 0.06)
    )
    $pts = foreach ($p in $norm) {
        New-Object System.Drawing.PointF ([float]($p[0] * $Size)), ([float]($p[1] * $Size))
    }
    $bolt = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(251, 191, 36))
    $g.FillPolygon($bolt, [System.Drawing.PointF[]]$pts)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Host "OK  $Path"
}

$root = Split-Path $PSScriptRoot -Parent
New-Icon -Size 512 -Path (Join-Path $root "icon-512.png")
New-Icon -Size 192 -Path (Join-Path $root "icon-192.png")
