import re
src=open('src/app.html',encoding='utf-8').read()
i=src.index('</style>')+len('</style>')
head,body=src[:i],src[i:]
html=f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#2347c5">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Cüzdanım">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="icon-192.png">
{head}
</head>
<body>
{body}
</body>
</html>
'''
open('index.html','w',encoding='utf-8').write(html)
