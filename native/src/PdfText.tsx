import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { toBase64 } from './syncFile';

/**
 * PDF'ten metin çıkarır: görünmez bir WebView içinde pdf.js çalıştırır (dosya cihazdan çıkmaz; yalnızca pdf.js kodu
 * internetten yüklenir). Satırlar PWA'daki gibi y/x konumuna göre birleştirilir.
 * Not: web önizlemesinde WebView olmadığı için bu bileşen çalışmaz; yalnızca iPhone'da denenebilir.
 */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

const html = (b64: string) => `<!doctype html><html><head><meta charset="utf-8"><script src="${PDFJS}/pdf.min.js"></script></head><body><script>
(async function(){
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  try{
    var blob=new Blob(["importScripts('${PDFJS}/pdf.worker.min.js');"],{type:'application/javascript'});
    pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(blob);
    var bin=atob(${JSON.stringify(b64)}),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    var pdf=await pdfjsLib.getDocument({data:u}).promise,out='';
    for(var p=1;p<=pdf.numPages;p++){
      var tc=await (await pdf.getPage(p)).getTextContent(),rows=[];
      tc.items.forEach(function(it){ if(!String(it.str).trim())return; var y=it.transform[5],x=it.transform[4],r=rows.find(function(r){return Math.abs(r.y-y)<=3});
        if(!r){r={y:y,items:[]};rows.push(r)} r.items.push({x:x,s:it.str}); });
      rows.sort(function(a,b){return b.y-a.y}).forEach(function(r){ out+=r.items.sort(function(a,b){return a.x-b.x}).map(function(i){return i.s}).join(' ')+'\\n'; });
    }
    post({text:out});
  }catch(e){ post({error:String(e&&e.message||e)}); }
})();
</script></body></html>`;

export function PdfText({ bytes, onText, onError }: { bytes: Uint8Array; onText: (t: string) => void; onError: (m: string) => void }) {
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    const tm = setTimeout(() => { if (!done.current) { done.current = true; onError('PDF okunamadı (zaman aşımı). İnternet bağlantını kontrol et veya Excel dosyasını dene.'); } }, 40000);
    return () => clearTimeout(tm);
  }, [bytes]); // eslint-disable-line
  if (Platform.OS === 'web') { setTimeout(() => { if (!done.current) { done.current = true; onError('Web önizlemede PDF okunamıyor. Excel dosyasını dene.'); } }, 0); return null; }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require('react-native-webview');
  return (
    <View style={{ width: 1, height: 1, opacity: 0 }} pointerEvents="none">
      <WebView originWhitelist={['*']} source={{ html: html(toBase64(bytes)), baseUrl: 'https://cdnjs.cloudflare.com' }} javaScriptEnabled
        onMessage={(e: any) => {
          if (done.current) return;
          done.current = true;
          try { const m = JSON.parse(e.nativeEvent.data); if (m.error) onError('PDF okunamadı: ' + m.error); else onText(m.text || ''); } catch { onError('PDF okunamadı'); }
        }}
        onError={() => { if (!done.current) { done.current = true; onError('PDF okunamadı (bağlantı hatası).'); } }} />
    </View>
  );
}
