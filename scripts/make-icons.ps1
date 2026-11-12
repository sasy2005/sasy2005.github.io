# Draws the app icons (same design as libretto.ico) as full-bleed PNGs for the PWA and iOS.
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'icons'
New-Item -ItemType Directory -Force $out | Out-Null

function Rounded([System.Drawing.RectangleF]$r, [float]$rad) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $rad * 2
  $p.AddArc($r.X, $r.Y, $d, $d, 180, 90)
  $p.AddArc($r.Right - $d, $r.Y, $d, $d, 270, 90)
  $p.AddArc($r.Right - $d, $r.Bottom - $d, $d, $d, 0, 90)
  $p.AddArc($r.X, $r.Bottom - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw([int]$size, [string]$name, [float]$scale) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#9b1c3a'))
  $u = $size / 100.0 * $scale        # 1 unit = 1% of the drawing area
  $o = ($size - 100 * $u) / 2        # centre the drawing
  $book = New-Object System.Drawing.RectangleF ($o + 23 * $u), ($o + 20 * $u), (54 * $u), (60 * $u)
  $g.FillPath([System.Drawing.Brushes]::White, (Rounded $book (4 * $u)))
  $spine = New-Object System.Drawing.RectangleF ($o + 23 * $u), ($o + 20 * $u), (11 * $u), (60 * $u)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#e9c9d2'))), $spine)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#9b1c3a')), (4.5 * $u)
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  foreach ($y in 38, 50, 62) { $g.DrawLine($pen, ($o + 43 * $u), ($o + $y * $u), ($o + 69 * $u), ($o + $y * $u)) }
  $g.Dispose()
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Draw 192 'icon-192.png' 1.0
Draw 512 'icon-512.png' 1.0
Draw 512 'icon-maskable-512.png' 0.8   # content inside the maskable safe zone
Draw 180 'apple-touch-icon.png' 1.0
Write-Host "Icons written to $out"
