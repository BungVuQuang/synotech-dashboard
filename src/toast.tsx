import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success'|'error'|'info';
type ToastItem = { id:string; kind:ToastKind; message:string };

export function notify(message:string, kind:ToastKind='success'){
  window.dispatchEvent(new CustomEvent('synotech:toast',{detail:{message,kind}}));
}

export function ToastHost(){
  const [items,setItems]=useState<ToastItem[]>([]);
  useEffect(()=>{
    const handler=(event:Event)=>{
      const detail=(event as CustomEvent).detail||{};
      const item:ToastItem={id:crypto.randomUUID(),kind:detail.kind||'info',message:String(detail.message||'Đã hoàn tất thao tác.')};
      setItems(current=>[...current.slice(-3),item]);
      window.setTimeout(()=>setItems(current=>current.filter(x=>x.id!==item.id)),3800);
    };
    window.addEventListener('synotech:toast',handler);
    return()=>window.removeEventListener('synotech:toast',handler);
  },[]);
  return <div className="toast-stack" aria-live="polite" aria-atomic="true">{items.map(item=>{
    const Icon=item.kind==='success'?CheckCircle2:item.kind==='error'?AlertCircle:Info;
    return <div className={`toast-item toast-${item.kind}`} key={item.id}><Icon size={19}/><span>{item.message}</span><button type="button" aria-label="Đóng thông báo" onClick={()=>setItems(current=>current.filter(x=>x.id!==item.id))}><X size={16}/></button></div>;
  })}</div>;
}
