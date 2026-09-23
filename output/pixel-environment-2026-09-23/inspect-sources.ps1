param([string]$PackRoot = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class SpriteInspect {
 static int[] Cuts(int[] projection,int parts) {
  int[] cuts=new int[parts+1];cuts[parts]=projection.Length;
  for(int n=1;n<parts;n++){int ideal=(int)Math.Round(n*projection.Length/(double)parts),radius=projection.Length/parts/5,best=ideal,bestScore=int.MaxValue;
   for(int k=ideal-radius;k<=ideal+radius;k++){int sum=0;for(int d=-4;d<=4;d++)sum+=projection[Math.Max(0,Math.Min(projection.Length-1,k+d))];int score=sum*1000+Math.Abs(k-ideal);if(score<bestScore){bestScore=score;best=k;}}
   cuts[n]=best;
  }return cuts;
 }
 public static int[][] Cells(string path, int cols, int rows) {
  using(var bmp = new Bitmap(path)) {
   var bd=bmp.LockBits(new Rectangle(0,0,bmp.Width,bmp.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   var bytes=new byte[Math.Abs(bd.Stride)*bmp.Height]; Marshal.Copy(bd.Scan0,bytes,0,bytes.Length);
   var px=new int[bmp.Width];var py=new int[bmp.Height];
   for(int yy=0;yy<bmp.Height;yy++)for(int xx=0;xx<bmp.Width;xx++)if(bytes[yy*bd.Stride+xx*4+3]>=192){px[xx]++;py[yy]++;}
   var xs=Cuts(px,cols);var ys=Cuts(py,rows);
   var result=new int[cols*rows][];
   for(int r=0;r<rows;r++) for(int c=0;c<cols;c++) {
    int x0=xs[c],x1=xs[c+1];
    int y0=ys[r],y1=ys[r+1];
    int w=x1-x0,h=y1-y0; var seen=new bool[w*h]; var queue=new int[w*h];
    int biggest=0,bx=x0,by=y0,bw=0,bh=0;
    for(int yy=0;yy<h;yy++) for(int xx=0;xx<w;xx++) {
     int p=yy*w+xx; if(seen[p])continue; seen[p]=true;
     if(bytes[(y0+yy)*bd.Stride+(x0+xx)*4+3]<192)continue;
     int head=0,tail=1;queue[0]=p;int minx=xx,maxx=xx,miny=yy,maxy=yy;
     while(head<tail) {int cur=queue[head++],cx=cur%w,cy=cur/w;minx=Math.Min(minx,cx);maxx=Math.Max(maxx,cx);miny=Math.Min(miny,cy);maxy=Math.Max(maxy,cy);
      for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++) {int nx=cx+dx,ny=cy+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;int np=ny*w+nx;if(seen[np])continue;seen[np]=true;if(bytes[(y0+ny)*bd.Stride+(x0+nx)*4+3]>=192)queue[tail++]=np;}
     }
     if(tail>=40){int lx=x0+minx,ly=y0+miny,rx=x0+maxx+1,ry=y0+maxy+1;if(biggest==0){bx=lx;by=ly;bw=rx-lx;bh=ry-ly;}else{int ux=Math.Min(bx,lx),uy=Math.Min(by,ly);bw=Math.Max(bx+bw,rx)-ux;bh=Math.Max(by+bh,ry)-uy;bx=ux;by=uy;}biggest+=tail;}
    }
    result[r*cols+c]=new int[]{bx,by,bw,bh,biggest,x0,y0,x1-x0,y1-y0};
   }
   bmp.UnlockBits(bd);return result;
  }
 }
}
'@ -ReferencedAssemblies System.Drawing.Common,System.Drawing.Primitives,System.Runtime.InteropServices,System.Private.Windows.GdiPlus,System.Private.Windows.Core
$sources = Get-Content -LiteralPath (Join-Path $PackRoot 'sources.json') -Raw | ConvertFrom-Json
$report = foreach($entry in $sources) {
 $sourcePath = Join-Path $PackRoot $entry.file
 $spriteBitmap = [System.Drawing.Bitmap]::new($sourcePath)
 $width=$spriteBitmap.Width; $height=$spriteBitmap.Height; $alpha=$spriteBitmap.GetPixel(0,0).A
 $spriteBitmap.Dispose()
 $cells=[SpriteInspect]::Cells($sourcePath,$entry.columns,$entry.rows)
 [PSCustomObject]@{id=$entry.id;file=$entry.file;width=$width;height=$height;cornerAlpha=$alpha;columns=$entry.columns;rows=$entry.rows;cells=$cells}
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PackRoot 'source-inspection.json') -Encoding utf8
$report | Select-Object id,width,height,cornerAlpha,@{n='frames';e={$_.cells.Count}} | Format-Table

