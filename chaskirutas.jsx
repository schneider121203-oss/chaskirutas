import { useState, useEffect } from "react";

// ═══ DATA ═════════════════════════════════════════════════════════════════════
const U=[
  {id:1,nm:"Carlos Mendoza",tel:"987654321",rl:"conductor",fs:6,rt:4.72,tr:248,pl:"ABC-123",cr:"Toyota Yaris Blanco",em:"🚗"},
  {id:2,nm:"María Quispe",tel:"976543210",rl:"conductor",fs:6,rt:4.91,tr:187,pl:"DEF-456",cr:"Hyundai Accent Gris",em:"🚗"},
  {id:3,nm:"Pedro Huamán",tel:"965432109",rl:"conductor",fs:3,rt:4.18,tr:45,pl:"GHI-789",cr:"Kia Rio Negro",em:"🚗"},
  {id:4,nm:"Jorge Del Solar",tel:"912345678",rl:"pasajero",em:"👤"},
  {id:5,nm:"Ana García",tel:"923456789",rl:"pasajero",em:"👤"},
  {id:6,nm:"Admin",tel:"900000000",rl:"admin",em:"📊"},
];
const D=[
  {id:1,n:"San Isidro",x:200,y:205,lt:-12.097,lg:-77.036},
  {id:2,n:"Miraflores",x:212,y:248,lt:-12.119,lg:-77.030},
  {id:3,n:"Surco",x:258,y:265,lt:-12.146,lg:-76.991},
  {id:4,n:"San Borja",x:242,y:215,lt:-12.106,lg:-76.998},
  {id:5,n:"La Molina",x:302,y:232,lt:-12.083,lg:-76.933},
  {id:6,n:"Callao",x:78,y:148,lt:-12.056,lg:-77.118},
  {id:7,n:"Los Olivos",x:178,y:82,lt:-11.958,lg:-77.063},
  {id:8,n:"SMP",x:190,y:108,lt:-11.977,lg:-77.052},
  {id:9,n:"Ate",x:312,y:182,lt:-12.024,lg:-76.918},
  {id:10,n:"SJL",x:270,y:92,lt:-11.965,lg:-76.967},
  {id:11,n:"Cercado",x:168,y:162,lt:-12.046,lg:-77.042},
  {id:12,n:"Barranco",x:198,y:270,lt:-12.150,lg:-77.021},
  {id:13,n:"Jesús María",x:180,y:188,lt:-12.071,lg:-77.044},
  {id:14,n:"Lince",x:200,y:195,lt:-12.083,lg:-77.033},
  {id:15,n:"Pueblo Libre",x:155,y:182,lt:-12.074,lg:-77.063},
  {id:16,n:"Rímac",x:180,y:140,lt:-12.025,lg:-77.030},
  {id:17,n:"V.E.S.",x:208,y:338,lt:-12.212,lg:-76.943},
  {id:18,n:"Chorrillos",x:172,y:295,lt:-12.170,lg:-77.015},
];
const COL=[
  {id:1,dst:"Cusco",pr:"Cusco",f:45,du:"~22h",km:1105,hr:"18:00",st:4},
  {id:2,dst:"Arequipa",pr:"Arequipa",f:35,du:"~16h",km:1009,hr:"20:00",st:4},
  {id:3,dst:"Huancayo",pr:"Junín",f:20,du:"~7h",km:298,hr:"06:00",st:4},
  {id:4,dst:"Ica",pr:"Ica",f:15,du:"~4h",km:303,hr:"07:00",st:4},
  {id:5,dst:"Huaraz",pr:"Áncash",f:25,du:"~8h",km:400,hr:"22:00",st:4},
  {id:6,dst:"Trujillo",pr:"La Libertad",f:30,du:"~9h",km:557,hr:"21:00",st:4},
];

// ═══ PRICING (Haversine + InDrive model) ══════════════════════════════════════
function hav(a,b){const R=6371,dL=(b.lt-a.lt)*Math.PI/180,dG=(b.lg-a.lg)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a.lt*Math.PI/180)*Math.cos(b.lt*Math.PI/180)*Math.sin(dG/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
const CATS=[
  {id:"viaje",nm:"Viaje",desc:"Viaja a tu precio",pax:4,mult:1.0,ic:"🚗"},
  {id:"confort",nm:"Confort",desc:"Conductores y carros seleccionados",pax:4,mult:1.15,ic:"🚙"},
  {id:"xl",nm:"XL",desc:"Vehículos amplios",pax:6,mult:1.6,ic:"🚐"},
];
// Tarifas calibradas a mercado real Lima 2026 (referencia InDrive/Uber Perú)
// Base S/1.50 + S/1.20/km + S/0.12/min + servicio S/0.80 | mínimo S/5.00
function calcP(a,b,cat){
  const km=Math.round(hav(a,b)*1.4*10)/10; // distancia vial ≈ 1.4× línea recta
  const min=Math.max(4,Math.round(km/18*60)); // velocidad promedio Lima 18 km/h
  const h=new Date().getHours();
  const sg=h>=22||h<6?1.3:(h>=7&&h<=9)||(h>=17&&h<=20)?1.2:1.0;
  const base=1.5, perKm=1.2, perMin=0.12, svc=0.8, minFare=5.0;
  const sub=(base + km*perKm + min*perMin) * sg * (cat?.mult||1) + svc;
  const tot=Math.max(minFare, Math.round(sub*10)/10);
  return{km,min,tot,sg,lo:Math.round(tot*.88*10)/10,hi:Math.round(tot*1.15*10)/10,base,perKm,perMin,svc};
}

// ═══ DARK THEME ═══════════════════════════════════════════════════════════════
const T={bg:"#1C1C1E",card:"#2C2C2E",card2:"#3A3A3C",acc:"#CDDC39",acc2:"#9E9D24",tx:"#FFFFFF",tx2:"#8E8E93",tx3:"#636366",bd:"#3A3A3C",gr:"#4CAF50",rd:"#FF5252",bl:"#42A5F5",or:"#FF9800"};

// ═══ MAP ══════════════════════════════════════════════════════════════════════
function Map({orig,dest,drvPos,reqs,onPick,h}){
  const pts=[];
  if(orig&&dest){for(let i=0;i<=10;i++){const t=i/10;pts.push({x:orig.x+(dest.x-orig.x)*t+Math.sin(t*Math.PI)*18,y:orig.y+(dest.y-orig.y)*t+Math.sin(t*Math.PI*1.2)*12})}}
  const path=pts.map((p,i)=>(i?"L":"M")+p.x+","+p.y).join("");
  return <svg viewBox="0 0 400 380" style={{width:"100%",height:h||300,display:"block",background:"#263238"}}>
    <ellipse cx="18" cy="220" rx="65" ry="180" fill="#1a3a4a" opacity=".4"/>
    <path d="M78,148 Q155,158 312,182" fill="none" stroke="#37474F" strokeWidth="3.5"/>
    <path d="M178,60 Q185,190 208,350" fill="none" stroke="#37474F" strokeWidth="3.5"/>
    <path d="M88,228 L320,228" fill="none" stroke="#37474F" strokeWidth="2.5" opacity=".5"/>
    <path d="M168,162 Q245,172 320,178" fill="none" stroke="#37474F" strokeWidth="2.5" opacity=".5"/>
    <text x="275" y="20" fill="rgba(255,255,255,.06)" fontSize="8">Lima Metro</text>
    {path&&<><path d={path} fill="none" stroke={T.acc} strokeWidth="4" strokeLinecap="round" opacity=".25"/><path d={path} fill="none" stroke={T.acc} strokeWidth="3" strokeLinecap="round" strokeDasharray="8,5"><animate attributeName="stroke-dashoffset" from="26" to="0" dur="1.2s" repeatCount="indefinite"/></path></>}
    {(reqs||[]).map((r,i)=><g key={i}><circle cx={r.ox} cy={r.oy} r="5" fill={T.or} opacity=".7"><animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite"/></circle><line x1={r.ox} y1={r.oy} x2={r.dx} y2={r.dy} stroke={T.or} strokeWidth="1.5" strokeDasharray="4,3" opacity=".3"/></g>)}
    {D.map(d=>{const isO=orig?.id===d.id,isD=dest?.id===d.id;return <g key={d.id} onClick={()=>onPick?.(d)} style={{cursor:onPick?"pointer":"default"}}>
      {(isO||isD)&&<circle cx={d.x} cy={d.y} r="16" fill="none" stroke={isO?T.gr:T.rd} strokeWidth="2" opacity=".3"><animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite"/></circle>}
      <circle cx={d.x} cy={d.y} r={isO||isD?8:3.5} fill={isO?T.gr:isD?T.rd:"rgba(255,255,255,.2)"} stroke={isO||isD?"#fff":"none"} strokeWidth={isO||isD?2:0}/>
      <text x={d.x+(d.x>260?-5:10)} y={d.y+4} fill={isO?T.gr:isD?T.rd:"rgba(255,255,255,.35)"} fontSize={isO||isD?"9.5":"8"} fontWeight={isO||isD?"700":"400"} textAnchor={d.x>260?"end":"start"}>{d.n}</text>
    </g>})}
    {drvPos&&<g><circle cx={drvPos.x} cy={drvPos.y} r="12" fill={T.acc} opacity=".15"><animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite"/></circle><circle cx={drvPos.x} cy={drvPos.y} r="8" fill={T.acc} stroke="#fff" strokeWidth="2"/><text x={drvPos.x} y={drvPos.y+4} textAnchor="middle" fontSize="10">🚕</text></g>}
  </svg>
}

// ═══ APP ═══════════════════════════════════════════════════════════════════════
export default function App(){
  const [s,setS]=useState("splash");
  const [u,setU]=useState(null);
  const [msg,setMsg]=useState(null);
  // Auth flow state
  const [authPh,setAuthPh]=useState("");
  const [authOtp,setAuthOtp]=useState("");
  const [regNm,setRegNm]=useState("");
  const [regDni,setRegDni]=useState("");
  const [regRl,setRegRl]=useState("pasajero");
  const [regLic,setRegLic]=useState("");
  const [regPl,setRegPl]=useState("");
  const [regCar,setRegCar]=useState("");
  const [orig,setOrig]=useState(null);
  const [dest,setDest]=useState(null);
  const [cat,setCat]=useState(CATS[0]);
  const [fare,setFare]=useState(null);
  const [offered,setOffered]=useState(0);
  const [ride,setRide]=useState("IDLE");
  const [drv,setDrv]=useState(null);
  const [eta,setEta]=useState(0);
  const [prog,setProg]=useState(0);
  const [rat,setRat]=useState(0);
  const [schedDt,setSchedDt]=useState("");
  const [schedTm,setSchedTm]=useState("");
  const [online,setOnline]=useState(false);
  const [fs,setFs]=useState(6);
  const [dReqs,setDReqs]=useState([]);
  const [dRide,setDRide]=useState(null);
  const [dPh,setDPh]=useState("IDLE");
  const [bk,setBk]=useState([]);
  const [colT,setColT]=useState(()=>COL.map((r,i)=>{const d=new Date();d.setDate(d.getDate()+i+1);return{...r,tid:200+i,jn:Math.floor(Math.random()*3)+1,dp:d.toISOString().split("T")[0],ok:true}}));
  const [newCol,setNewCol]=useState({d:"",date:"",time:"06:00",fare:""});
  // Enhanced formalization state
  const [fDocs,setFDocs]=useState({dni_f:false,dni_b:false,selfie:false,lic:false,antec:false,soat:false,citv:false,tprop:false,terms:false,firma:false,pago:false,djurada:false});
  // Enhanced colectivo join flow
  const [colJoin,setColJoin]=useState(null); // {tid, step: "verify"|"deposit"|"confirm"|"done"}
  const [colDni,setColDni]=useState("");
  const [colDeposit,setColDeposit]=useState(false);
  const [sq,setSq]=useState(""); // route search query
  const [drvOffers,setDrvOffers]=useState([]); // offers from drivers to passenger
  const [pts,setPts]=useState(120);
  const [payMethod,setPayMethod]=useState("efectivo"); // efectivo|yape|tarjeta
  const [showMenu,setShowMenu]=useState(false); // sidebar
  const [drvRatPax,setDrvRatPax]=useState(0); // driver rates passenger
  const [expenses,setExpenses]=useState([{id:1,t:"Combustible",m:45,d:"2026-06-21"},{id:2,t:"Peaje",m:7.5,d:"2026-06-21"},{id:3,t:"Lavado",m:15,d:"2026-06-20"},{id:4,t:"Mantenimiento",m:120,d:"2026-06-18"}]);
  const [expT,setExpT]=useState("Combustible");
  const [expA,setExpA]=useState("");
  const [showReceipt,setShowReceipt]=useState(null); // receipt data
  const [promoCode,setPromoCode]=useState("");
  const [promoApplied,setPromoApplied]=useState(null);
  const [referralCode]=useState("CHASKI-"+Math.random().toString(36).slice(2,7).toUpperCase());
  const [docs]=useState([
    {nm:"SOAT",vence:"2026-07-15",dias:23,st:"⚠️"},{nm:"CITV",vence:"2026-09-20",dias:90,st:"✓"},
    {nm:"Licencia",vence:"2027-06-15",dias:358,st:"✓"},{nm:"TUC",vence:"2034-08-15",dias:2975,st:"✓"}
  ]);

  const nt=(m)=>{setMsg(m);setTimeout(()=>setMsg(null),2500)};
  const sf=n=>(Number(n)||0).toFixed(2);
  const reset=()=>{setOrig(null);setDest(null);setFare(null);setRide("IDLE");setDrv(null);setProg(0);setRat(0);setOffered(0);setSchedDt("");setSchedTm("")};

  // Driver requests
  useEffect(()=>{
    if(u?.rl!=="conductor"||!online||dRide)return;
    const gen=()=>{const o=D[Math.floor(Math.random()*D.length)];let dd=D[Math.floor(Math.random()*D.length)];if(o.id===dd.id)dd=D[(o.id)%D.length];const f=calcP(o,dd,CATS[0]);const nms=["Ana García","Luis Ramos","Carmen Díaz","José Torres"];setDReqs(p=>[{id:Date.now()+Math.random(),ox:o.x,oy:o.y,dx:dd.x,dy:dd.y,oN:o.n,dN:dd.n,fare:f.tot,km:f.km,mn:f.min,net:Math.round(f.tot*.85*10)/10,pax:nms[Math.floor(Math.random()*nms.length)],pR:(4+Math.random()).toFixed(1),tm:new Date().toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})},...p].slice(0,5))};
    gen();const iv=setInterval(gen,8e3);return()=>clearInterval(iv);
  },[u,online,dRide]);

  useEffect(()=>{if(ride!=="GO")return;const iv=setInterval(()=>setProg(p=>{if(p>=100){setRide("DONE");return 100}return p+Math.random()*3+1}),1500);return()=>clearInterval(iv)},[ride]);
  useEffect(()=>{if(ride!=="ASGN")return;const iv=setInterval(()=>setEta(e=>{if(e<=0){setRide("PKUP");return 0}return e-1}),2e3);return()=>clearInterval(iv)},[ride]);

  // ── Shared
  const Toast=()=>msg?<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"12px 22px",borderRadius:12,background:T.acc,color:"#000",fontSize:14,fontWeight:700,maxWidth:340,textAlign:"center",boxShadow:"0 8px 24px rgba(0,0,0,.4)"}}>{msg}</div>:null;
  const Btn=({children,bg=T.acc,fg="#000",onClick,disabled,style:st})=><button disabled={disabled} onClick={onClick} style={{background:disabled?T.card2:bg,color:disabled?T.tx3:fg,border:"none",borderRadius:12,padding:"15px 20px",fontSize:15,fontWeight:700,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:disabled?"default":"pointer",opacity:disabled?.5:1,...st}}>{children}</button>;
  const Cd=({children,onClick,style:st})=><div onClick={onClick} style={{background:T.card,borderRadius:14,padding:16,marginBottom:12,cursor:onClick?"pointer":"default",...st}}>{children}</div>;
  const Hdr=({title,sub,back})=><div style={{background:T.bg,color:T.tx,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.bd}`}}>{back&&<button onClick={back} style={{background:T.card,border:"none",width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.tx,fontSize:16}}>←</button>}<div style={{flex:1}}><div style={{fontSize:17,fontWeight:800}}>{title}</div>{sub&&<div style={{fontSize:12,color:T.tx2,marginTop:2}}>{sub}</div>}</div></div>;
  const Bdg=({children,bg=T.card2,fg=T.acc})=><span style={{background:bg,color:fg,padding:"4px 10px",borderRadius:10,fontSize:11,fontWeight:700}}>{children}</span>;

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLASH
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="splash")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",justifyContent:"center",padding:"28px 24px"}}>
    <div style={{textAlign:"center",marginBottom:32}}>
      <div style={{fontSize:48,marginBottom:10}}>🚕</div>
      <h1 style={{fontSize:32,fontWeight:900,color:T.tx,margin:0}}>ChaskiRutas</h1>
      <p style={{color:T.acc,fontSize:13,marginTop:8}}>Taxi formal en Lima · Colectivo legal en provincia</p>
    </div>
    <Cd style={{border:`1px solid ${T.acc}33`,marginBottom:24}}>
      <div style={{fontSize:12,fontWeight:700,color:T.acc,marginBottom:4}}>⚖️ 100% dentro de la ley</div>
      <div style={{fontSize:11,color:T.tx2,lineHeight:1.6}}>Lima/Callao → Taxi con TUC de la ATU<br/>Provincias → Colectivo con concesión DRTC</div>
    </Cd>
    <Btn onClick={()=>setS("login")}>Iniciar sesión</Btn>
    <div style={{height:10}}/>
    <Btn bg={T.card} fg={T.tx} onClick={()=>setS("register")} style={{border:`1px solid ${T.bd}`}}>Crear cuenta nueva</Btn>
    <p style={{color:T.tx3,fontSize:10,textAlign:"center",marginTop:24}}>UNMSM FISI · Grupo 1 · 2026</p>
  </div>);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN — Ingreso de teléfono
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="login"){
    const found=U.find(x=>x.tel===authPh);
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg,padding:"24px 20px"}}>
      <Toast/>
      <button onClick={()=>setS("splash")} style={{background:T.card,border:"none",width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.tx,fontSize:16,marginBottom:20}}>←</button>
      <h2 style={{fontSize:22,fontWeight:800,color:T.tx}}>Iniciar sesión</h2>
      <p style={{color:T.tx2,fontSize:13,margin:"6px 0 20px"}}>Ingresa tu número de celular registrado</p>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:12,fontWeight:600,color:T.tx2,display:"block",marginBottom:6}}>Número de celular</label>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{padding:"12px 14px",borderRadius:12,background:T.card,color:T.tx2,fontSize:15,border:`1px solid ${T.bd}`}}>+51</span>
          <input type="tel" placeholder="987 654 321" value={authPh} onChange={e=>setAuthPh(e.target.value.replace(/\D/g,"").slice(0,9))}
            style={{flex:1,padding:"12px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:16,fontWeight:600,outline:"none",letterSpacing:"1px"}}/>
        </div>
      </div>
      {authPh.length===9&&found&&<Cd style={{borderLeft:`4px solid ${T.gr}`,padding:12,marginBottom:16}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:16}}>✅</span>
        <div><div style={{fontSize:14,fontWeight:700,color:T.gr}}>{found.nm}</div><div style={{fontSize:12,color:T.tx2}}>{found.rl} registrado</div></div></div>
      </Cd>}
      {authPh.length===9&&!found&&<Cd style={{borderLeft:`4px solid ${T.or}`,padding:12,marginBottom:16}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:16}}>⚠️</span>
        <div style={{fontSize:13,color:T.or}}>Número no registrado. <span style={{color:T.tx2}}>¿Deseas <b onClick={()=>setS("register")} style={{color:T.acc,cursor:"pointer",textDecoration:"underline"}}>crear una cuenta</b>?</span></div></div>
      </Cd>}
      <Btn disabled={!found} onClick={()=>{nt("📱 Código OTP enviado a +51 "+authPh);setS("otp")}}>Enviar código OTP</Btn>

      {/* Quick access for testing */}
      <div style={{marginTop:24,padding:"14px 16px",background:T.card,borderRadius:12,border:`1px dashed ${T.bd}`}}>
        <div style={{fontSize:12,fontWeight:700,color:T.tx2,marginBottom:10}}>🧪 Cuentas de prueba (toca para autocompletar)</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {U.map(x=><button key={x.id} onClick={()=>setAuthPh(x.tel)} style={{padding:"6px 12px",borderRadius:8,background:authPh===x.tel?T.acc+"22":T.card2,border:`1px solid ${authPh===x.tel?T.acc:T.bd}`,color:authPh===x.tel?T.acc:T.tx2,fontSize:11,fontWeight:600,cursor:"pointer"}}>{x.nm.split(" ")[0]} · {x.tel.slice(-4)}</button>)}
        </div>
      </div>
    </div>)}

  // ═══════════════════════════════════════════════════════════════════════════
  // OTP VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="otp"){
    const found=U.find(x=>x.tel===authPh);
    const valid=found&&authOtp==="1234";
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg,padding:"24px 20px"}}>
      <Toast/>
      <button onClick={()=>{setAuthOtp("");setS("login")}} style={{background:T.card,border:"none",width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.tx,fontSize:16,marginBottom:20}}>←</button>
      <h2 style={{fontSize:22,fontWeight:800,color:T.tx}}>Verificación OTP</h2>
      <p style={{color:T.tx2,fontSize:13,margin:"6px 0 6px"}}>Ingresa el código de 4 dígitos enviado a</p>
      <p style={{color:T.tx,fontSize:15,fontWeight:700,marginBottom:20}}>+51 {authPh}</p>

      <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:12}}>
        {[0,1,2,3].map(i=><input key={i} maxLength={1} inputMode="numeric"
          value={authOtp[i]||""}
          onChange={e=>{
            const v=authOtp.split("");v[i]=e.target.value.replace(/\D/g,"");setAuthOtp(v.join("").slice(0,4));
            if(e.target.value&&e.target.nextElementSibling)e.target.nextElementSibling.focus();
          }}
          style={{width:52,height:60,textAlign:"center",fontSize:24,fontWeight:800,borderRadius:12,border:`2px solid ${authOtp.length>i?T.acc:T.bd}`,background:T.card,color:T.tx,outline:"none"}}/>)}
      </div>

      <p style={{fontSize:12,color:T.acc,textAlign:"center",marginBottom:20}}>💡 Código de prueba: <b>1234</b></p>

      {authOtp.length===4&&!valid&&<Cd style={{borderLeft:`4px solid ${T.rd}`,padding:12,marginBottom:12}}>
        <div style={{fontSize:13,color:T.rd,fontWeight:600}}>❌ Código incorrecto</div>
      </Cd>}

      {valid&&<Cd style={{borderLeft:`4px solid ${T.gr}`,padding:12,marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:20}}>✅</span>
        <div><div style={{fontSize:15,fontWeight:700,color:T.gr}}>Verificado</div><div style={{fontSize:13,color:T.tx}}>{found.nm}</div><div style={{fontSize:12,color:T.tx2}}>{found.rl} · DNI: {found.tel.slice(0,4)}****</div></div></div>
      </Cd>}

      <Btn disabled={!valid} bg={T.gr} fg="#fff" onClick={()=>{
        setU(found);if(found.fs!==undefined)setFs(found.fs);
        nt("👋 Bienvenido, "+found.nm);
        setAuthOtp("");setAuthPh("");
        setS(found.rl==="pasajero"?"home":found.rl==="conductor"?"drv":"admin");
      }}>Ingresar</Btn>

      <p style={{textAlign:"center",fontSize:13,color:T.tx3,marginTop:16}}>¿No recibiste el código? <b onClick={()=>nt("📱 Código reenviado")} style={{color:T.acc,cursor:"pointer"}}>Reenviar</b></p>
    </div>)}

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRO DE USUARIO NUEVO
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="register")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg,padding:"24px 20px"}}>
    <Toast/>
    <button onClick={()=>setS("splash")} style={{background:T.card,border:"none",width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.tx,fontSize:16,marginBottom:20}}>←</button>
    <h2 style={{fontSize:22,fontWeight:800,color:T.tx}}>Crear cuenta</h2>
    <p style={{color:T.tx2,fontSize:13,margin:"6px 0 20px"}}>Completa tus datos para registrarte</p>

    {/* Role selection */}
    <div style={{fontSize:13,fontWeight:600,color:T.tx2,marginBottom:8}}>¿Cómo usarás ChaskiRutas?</div>
    <div style={{display:"flex",gap:8,marginBottom:20}}>
      {[{r:"pasajero",ic:"👤",l:"Pasajero",d:"Pedir taxi / colectivo"},{r:"conductor",ic:"🚗",l:"Conductor",d:"Recibir viajes"}].map(o=>
        <button key={o.r} onClick={()=>setRegRl(o.r)} style={{flex:1,padding:"14px 12px",borderRadius:14,border:`2px solid ${regRl===o.r?T.acc:T.bd}`,background:regRl===o.r?T.acc+"15":T.card,cursor:"pointer",textAlign:"center"}}>
          <div style={{fontSize:24}}>{o.ic}</div>
          <div style={{fontSize:14,fontWeight:700,color:regRl===o.r?T.acc:T.tx,marginTop:4}}>{o.l}</div>
          <div style={{fontSize:11,color:T.tx2,marginTop:2}}>{o.d}</div>
        </button>
      )}
    </div>

    {/* Personal data */}
    <div style={{marginBottom:12}}>
      <label style={{fontSize:12,fontWeight:600,color:T.tx2,display:"block",marginBottom:6}}>Nombre completo</label>
      <input placeholder="Ej: Juan Pérez López" value={regNm} onChange={e=>setRegNm(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
    </div>
    <div style={{marginBottom:12}}>
      <label style={{fontSize:12,fontWeight:600,color:T.tx2,display:"block",marginBottom:6}}>DNI (8 dígitos)</label>
      <input placeholder="12345678" inputMode="numeric" value={regDni} onChange={e=>{const v=e.target.value.replace(/\D/g,"");if(v.length<=8)setRegDni(v)}} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
    </div>
    <div style={{marginBottom:12}}>
      <label style={{fontSize:12,fontWeight:600,color:T.tx2,display:"block",marginBottom:6}}>Número de celular</label>
      <div style={{display:"flex",gap:8}}>
        <span style={{padding:"12px 14px",borderRadius:12,background:T.card2,color:T.tx2,fontSize:15,border:`1px solid ${T.bd}`}}>+51</span>
        <input type="tel" placeholder="987654321" value={authPh} onChange={e=>setAuthPh(e.target.value.replace(/\D/g,"").slice(0,9))} style={{flex:1,padding:"12px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:15,outline:"none"}}/>
      </div>
    </div>

    {/* Conductor extra fields */}
    {regRl==="conductor"&&<>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:12,fontWeight:600,color:T.tx2,display:"block",marginBottom:6}}>N° Licencia de conducir</label>
        <input placeholder="Q12-XXXXXXXX" value={regLic} onChange={e=>setRegLic(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:12,fontWeight:600,color:T.tx2,display:"block",marginBottom:6}}>Placa del vehículo</label>
        <input placeholder="ABC-123" value={regPl} onChange={e=>setRegPl(e.target.value.toUpperCase())} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:12,fontWeight:600,color:T.tx2,display:"block",marginBottom:6}}>Vehículo (marca modelo color)</label>
        <input placeholder="Toyota Yaris Blanco" value={regCar} onChange={e=>setRegCar(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <Cd style={{background:T.or+"15",border:`1px solid ${T.or}33`,padding:12,marginBottom:12}}>
        <div style={{fontSize:12,color:T.or}}>⚠️ Después del registro iniciarás el proceso de formalización ATU (6 pasos) para obtener tu TUC</div>
      </Cd>
    </>}

    <Btn disabled={!regNm||regDni.length<8||authPh.length<9||(regRl==="conductor"&&(!regPl||!regCar))} onClick={()=>{
      const newU={id:U.length+1,nm:regNm,tel:authPh,rl:regRl,em:regRl==="conductor"?"🚗":"👤",fs:regRl==="conductor"?1:undefined,rt:0,tr:0,pl:regPl,cr:regCar};
      U.push(newU);setU(newU);
      if(regRl==="conductor")setFs(1);
      nt("✅ ¡Cuenta creada! Bienvenido, "+regNm);
      setRegNm("");setRegDni("");setAuthPh("");setRegLic("");setRegPl("");setRegCar("");
      setS(regRl==="pasajero"?"home":"drv");
    }}>Crear cuenta{regRl==="conductor"?" de conductor":""}</Btn>
  </div>);

  // ═══════════════════════════════════════════════════════════════════════════
  // PASSENGER HOME (InDrive-style)
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="home")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
    <Toast/>
    <div style={{padding:"16px 20px"}}>
      {/* Search bar */}
      <div onClick={()=>setS("pick")} style={{background:T.card,borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",marginBottom:16}}>
        <span style={{fontSize:18}}>🔍</span>
        <span style={{fontSize:16,color:T.tx2,fontWeight:500}}>¿A dónde y por cuánto?</span>
        <span style={{marginLeft:"auto",color:T.tx3}}>›</span>
      </div>
      {/* Recent locations */}
      {[{ic:"📍",nm:"Aeropuerto Jorge Chávez",dst:"Callao"},{ic:"📍",nm:"MegaPlaza Independencia",dst:"Independencia"},{ic:"🏠",nm:"Casa — Los Olivos",dst:"Los Olivos"}].map((l,i)=><div key={i} onClick={()=>{const d=D.find(x=>x.n===l.dst);if(d){setOrig(D[0]);setDest(d);setFare(calcP(D[0],d,cat));setOffered(calcP(D[0],d,cat).tot);setS("ride")}}} style={{display:"flex",gap:14,alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${T.bd}`,cursor:"pointer"}}>
        <span style={{fontSize:16,color:T.tx2}}>{l.ic}</span>
        <span style={{fontSize:14,color:T.tx,fontWeight:500}}>{l.nm}</span>
      </div>)}
    </div>

    {/* Services grid */}
    <div style={{padding:"12px 20px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Cd onClick={()=>setS("pick")} style={{padding:0,overflow:"hidden",gridRow:"span 2"}}>
          <div style={{padding:"16px 14px",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div style={{fontSize:15,fontWeight:700,color:T.tx}}>Viajes en la ciudad</div>
            <div style={{fontSize:40,textAlign:"center",marginTop:12}}>🚗💨</div>
          </div>
        </Cd>
        <Cd onClick={()=>setS("col")} style={{padding:"14px"}}>
          <div style={{fontSize:13,fontWeight:700,color:T.tx}}>Ciudad a Ciudad</div>
          <div style={{fontSize:11,color:T.tx2,marginTop:2}}>Colectivo a provincia</div>
          <div style={{fontSize:24,textAlign:"right",marginTop:4}}>🚐</div>
        </Cd>
        <Cd style={{padding:"14px"}}>
          <div style={{fontSize:13,fontWeight:700,color:T.tx}}>Flete</div>
          <div style={{fontSize:11,color:T.tx2,marginTop:2}}>Próximamente</div>
          <div style={{fontSize:24,textAlign:"right",marginTop:4}}>📦</div>
        </Cd>
      </div>
    </div>

    {/* Ride categories */}
    <div style={{padding:"8px 20px"}}>
      <div style={{fontSize:15,fontWeight:700,color:T.tx,marginBottom:12}}>🚕 Elige un viaje en la ciudad</div>
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
        {CATS.map(c=><div key={c.id} onClick={()=>{setCat(c);setS("pick")}} style={{minWidth:140,background:T.card,borderRadius:14,padding:"14px",cursor:"pointer",border:cat.id===c.id?`2px solid ${T.acc}`:`1px solid ${T.bd}`}}>
          <div style={{fontSize:28,marginBottom:6}}>{c.ic}</div>
          <div style={{fontSize:14,fontWeight:700,color:T.tx}}>{c.nm}</div>
          <div style={{fontSize:11,color:T.tx2,marginTop:2}}>{c.desc}</div>
        </div>)}
      </div>
    </div>

    {/* Bottom nav */}
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:440,background:T.card,display:"flex",borderTop:`1px solid ${T.bd}`,padding:"8px 0 12px"}}>
      {[{l:"Inicio",ic:"🏠",sc:"home"},{l:"Viajes",ic:"📋",sc:"trips"},{l:"Provincia",ic:"🚐",sc:"col"},{l:"Referidos",ic:"🎁",sc:"referral"},{l:"Menú",ic:"☰",sc:"menu"}].map(n=><button key={n.l} onClick={()=>setS(n.sc)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:s===n.sc?T.acc:T.tx3,fontSize:10,fontWeight:600}}><span style={{fontSize:18}}>{n.ic}</span>{n.l}</button>)}
    </div>
  </div>);

  // ═══════════════════════════════════════════════════════════════════════════
  // PICK ORIGIN/DEST ON MAP
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="pick"){
    const filtered=sq?D.filter(d=>d.n.toLowerCase().includes(sq.toLowerCase())):[];
    const pickDist=(d)=>{
      if(!orig){setOrig(d);setSq("");nt("📍 Origen: "+d.n)}
      else if(!dest&&d.id!==orig.id){setDest(d);setSq("");const f=calcP(orig,d,cat);setFare(f);setOffered(f.tot);nt("📍 Destino: "+d.n);setS("ride")}
    };
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
      <Toast/>
      <Hdr title="Selecciona tu ruta" back={()=>{reset();setS("home")}}/>
      {/* Text search bar */}
      <div style={{padding:"8px 20px"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",background:T.card,borderRadius:12,padding:"4px 14px",border:`1px solid ${T.bd}`}}>
          <span style={{fontSize:16}}>🔍</span>
          <input placeholder={!orig?"Buscar origen (ej: Miraflores)":"Buscar destino..."} value={sq} onChange={e=>setSq(e.target.value)} style={{flex:1,padding:"10px 0",background:"transparent",border:"none",color:T.tx,fontSize:14,outline:"none"}}/>
          {sq&&<button onClick={()=>setSq("")} style={{background:"none",border:"none",color:T.tx3,cursor:"pointer",fontSize:16}}>✕</button>}
        </div>
        {/* Search results dropdown */}
        {sq&&filtered.length>0&&<Cd style={{padding:0,marginTop:4}}>
          {filtered.map(d=><button key={d.id} onClick={()=>pickDist(d)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"transparent",border:"none",borderBottom:`1px solid ${T.bd}`,cursor:"pointer",textAlign:"left",color:T.tx}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:!orig?T.gr:T.rd}}/>
            <div><div style={{fontSize:14,fontWeight:600}}>{d.n}</div><div style={{fontSize:11,color:T.tx3}}>Lima · {d.z}</div></div>
          </button>)}
        </Cd>}
        {sq&&filtered.length===0&&<div style={{padding:"12px 0",fontSize:13,color:T.tx3,textAlign:"center"}}>No se encontró "{sq}"</div>}
      </div>
      {/* Selected origin/dest display */}
      {orig&&<div style={{padding:"0 20px",marginBottom:4}}>
        <div style={{display:"flex",gap:10,alignItems:"center",padding:"8px 14px",background:T.gr+"15",borderRadius:10}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:T.gr}}/><span style={{fontSize:13,color:T.gr,fontWeight:600}}>Origen: {orig.n}</span>
          <button onClick={()=>{setOrig(null);setDest(null);setFare(null)}} style={{marginLeft:"auto",background:"none",border:"none",color:T.tx3,cursor:"pointer",fontSize:12}}>Cambiar</button>
        </div>
      </div>}
      {dest&&<div style={{padding:"0 20px",marginBottom:4}}>
        <div style={{display:"flex",gap:10,alignItems:"center",padding:"8px 14px",background:T.rd+"15",borderRadius:10}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:T.rd}}/><span style={{fontSize:13,color:T.rd,fontWeight:600}}>Destino: {dest.n}</span>
        </div>
      </div>}
      {/* Map */}
      <Map orig={orig} dest={dest} onPick={pickDist} h={!orig?340:280}/>
      <div style={{padding:"8px 20px"}}>
        {!orig&&<Cd style={{border:`1px solid ${T.gr}33`,padding:12}}><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:12,height:12,borderRadius:"50%",background:T.gr}}/><span style={{fontSize:13,fontWeight:600,color:T.tx}}>Busca o toca en el mapa tu ORIGEN</span></div></Cd>}
        {orig&&!dest&&<Cd style={{border:`1px solid ${T.rd}33`,padding:12}}><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:12,height:12,borderRadius:"50%",background:T.rd}}/><span style={{fontSize:13,fontWeight:600,color:T.tx}}>Ahora busca o toca tu DESTINO</span></div></Cd>}
      </div>
    </div>)}

  // ═══════════════════════════════════════════════════════════════════════════
  // RIDE REQUEST (InDrive style — propose your price)
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="ride"&&fare&&(ride==="IDLE"||ride==="EST"))return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
    <Toast/>
    <Hdr title="Tu viaje" sub={cat.nm} back={()=>{reset();setS("pick")}}/>
    {/* Origin/Dest header */}
    <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:T.gr}}/><span style={{fontSize:14,color:T.tx,fontWeight:600}}>{orig?.n}</span>
        <span style={{color:T.tx3,fontSize:12,marginLeft:"auto"}}>{fare.km} km</span>
      </div>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:T.rd}}/><span style={{fontSize:14,color:T.tx,fontWeight:600}}>{dest?.n}</span>
        <span style={{color:T.tx3,fontSize:12,marginLeft:"auto"}}>~{fare.min} min</span>
      </div>
    </div>

    {/* Map */}
    <Map orig={orig} dest={dest} h={200}/>

    {/* Promo code - FUNCTIONAL */}
    <div style={{padding:"0 20px",marginTop:8}}>
      <Cd style={{padding:12,border:`1px solid ${T.bd}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🎫</span>
          <input placeholder="Código promocional" value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())} style={{flex:1,background:"transparent",border:"none",color:T.tx,fontSize:13,outline:"none"}}/>
          <button onClick={()=>{
            if(promoCode==="PRIMERA"){setPromoApplied({n:"PRIMERA",d:"50% off",v:0.5,t:"pct"});nt("🎫 -50% aplicado!")}
            else if(promoCode==="AMIGO10"){setPromoApplied({n:"AMIGO10",d:"S/10 off",v:10,t:"fijo"});nt("🎫 -S/10 aplicado!")}
            else{nt("Código inválido")}
          }} style={{padding:"6px 14px",borderRadius:8,background:T.acc,color:"#000",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>Aplicar</button>
        </div>
        {promoApplied&&<div style={{marginTop:8,padding:"6px 10px",background:T.acc+"18",borderRadius:8,fontSize:12,color:T.acc}}>✅ {promoApplied.n}: {promoApplied.d}</div>}
      </Cd>
    </div>

    {/* Payment method selector */}
    <div style={{padding:"0 20px",marginTop:4}}>
      <Cd style={{padding:14}}>
        <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:10}}>💳 Método de pago</div>
        <div style={{display:"flex",gap:6}}>
          {[{id:"efectivo",ic:"💵",nm:"Efectivo"},{id:"yape",ic:"📱",nm:"Yape"},{id:"tarjeta",ic:"💳",nm:"Tarjeta"}].map(p=>
            <button key={p.id} onClick={()=>setPayMethod(p.id)} style={{flex:1,padding:"10px 8px",borderRadius:10,border:`2px solid ${payMethod===p.id?T.acc:T.bd}`,background:payMethod===p.id?T.acc+"15":"transparent",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:20}}>{p.ic}</div>
              <div style={{fontSize:11,fontWeight:600,color:payMethod===p.id?T.acc:T.tx2,marginTop:4}}>{p.nm}</div>
            </button>
          )}
        </div>
      </Cd>
    </div>

    {/* Categories selector */}
    <div style={{display:"flex",gap:0,padding:"0 20px",marginBottom:4}}>
      {CATS.map(c=><button key={c.id} onClick={()=>{setCat(c);const f=calcP(orig,dest,c);setFare(f);setOffered(f.tot)}} style={{flex:1,padding:"12px 8px",background:cat.id===c.id?T.card:"transparent",border:`1px solid ${cat.id===c.id?T.acc:T.bd}`,borderRadius:10,marginRight:6,cursor:"pointer",textAlign:"center"}}>
        <div style={{fontSize:14,fontWeight:700,color:cat.id===c.id?T.tx:T.tx2}}>{c.nm}</div>
        <div style={{fontSize:11,color:T.tx3,marginTop:2}}>👤 {c.pax} · {fare.min} min</div>
      </button>)}
    </div>

    {/* Price proposal (InDrive "Viaja a tu precio") */}
    <div style={{padding:"8px 20px"}}>
      <Cd style={{textAlign:"center",padding:20}}>
        <div style={{fontSize:12,color:T.tx2,marginBottom:4}}>{cat.desc}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
          <button onClick={()=>setOffered(Math.max(fare.lo,offered-1))} style={{width:48,height:48,borderRadius:"50%",background:T.card2,border:"none",cursor:"pointer",fontSize:22,color:T.tx}}>−</button>
          <div>
            <div style={{fontSize:36,fontWeight:900,color:T.acc}}>S/ {sf(offered)}</div>
            <div style={{fontSize:12,color:T.tx3,marginTop:2}}>Tarifa recomendada: S/ {sf(fare.tot)}</div>
          </div>
          <button onClick={()=>setOffered(Math.min(fare.hi*1.3,offered+1))} style={{width:48,height:48,borderRadius:"50%",background:T.card2,border:"none",cursor:"pointer",fontSize:22,color:T.tx}}>+</button>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:10,fontSize:12,color:T.tx3}}>
          <span>Mín S/{sf(fare.lo)}</span><span>·</span><span>Máx S/{sf(fare.hi)}</span>
        </div>
      </Cd>

      {/* Schedule */}
      <Cd style={{padding:14}}>
        <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:8}}>⏰ ¿Programar viaje?</div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={schedDt} onChange={e=>setSchedDt(e.target.value)} style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.card2,color:T.tx,fontSize:13}}/>
          <input type="time" value={schedTm} onChange={e=>setSchedTm(e.target.value)} style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.card2,color:T.tx,fontSize:13}}/>
        </div>
      </Cd>

      {/* Auto-accept toggle */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",marginBottom:8}}>
        <span style={{fontSize:13,color:T.tx}}>Aceptar automáticamente la oferta</span>
        <div style={{width:44,height:24,borderRadius:12,background:T.card2,position:"relative"}}><div style={{width:18,height:18,borderRadius:"50%",background:T.tx3,position:"absolute",top:3,left:3}}/></div>
      </div>

      <Btn onClick={()=>{
        if(schedDt&&schedTm){setBk([...bk,{id:Date.now(),tp:"TAXI",o:orig?.n,d:dest?.n,fare:offered,drv:"Por asignar",cat:cat.nm,dt:schedDt+"T"+schedTm,sc:true}]);nt("📅 Viaje agendado: "+schedDt+" "+schedTm);reset();setS("home");return}
        setRide("MATCH");setDrvOffers([]);
        // Simulate drivers responding with offers over time
        const drivers=U.filter(x=>x.rl==="conductor"&&(x.fs||0)>=6);
        setTimeout(()=>{setDrvOffers(prev=>[...prev,{...drivers[0],offer:offered,eta:Math.floor(Math.random()*4)+2,dist:(Math.random()*3+0.5).toFixed(1)}])},2e3);
        setTimeout(()=>{setDrvOffers(prev=>[...prev,{...drivers[1],offer:Math.round((offered*1.1)*10)/10,eta:Math.floor(Math.random()*4)+3,dist:(Math.random()*3+1).toFixed(1)}])},4e3);
        if(drivers[2])setTimeout(()=>{setDrvOffers(prev=>[...prev,{...drivers[2]||drivers[0],offer:Math.round((offered*0.95)*10)/10,eta:Math.floor(Math.random()*5)+4,dist:(Math.random()*4+1.5).toFixed(1)}])},6e3);
      }}>
        <span style={{fontSize:18}}>🚕</span> {schedDt?"Agendar viaje":"Encontrar ofertas"} · S/ {sf(offered)}
      </Btn>
    </div>
  </div>);

  // ═══════════════════════════════════════════════════════════════════════════
  // RIDE: DRIVER OFFERS (InDrive flow — passenger chooses)
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="ride"&&ride==="MATCH")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
    <Toast/>
    <Hdr title="Ofertas de conductores" sub={"Tu precio: S/ "+sf(offered)+" · "+cat.nm} back={()=>{setRide("IDLE");setDrvOffers([])}}/>
    <Map orig={orig} dest={dest} h={180}/>
    <div style={{padding:"14px 20px"}}>
      {drvOffers.length===0&&<Cd style={{textAlign:"center",padding:24}}>
        <div style={{fontSize:36,marginBottom:10}}>🔍</div>
        <div style={{fontSize:15,fontWeight:700,color:T.tx}}>Buscando conductores cercanos...</div>
        <div style={{fontSize:12,color:T.tx2,marginTop:4}}>Las ofertas aparecerán aquí conforme los conductores respondan</div>
      </Cd>}
      {drvOffers.length>0&&<div style={{fontSize:13,fontWeight:600,color:T.tx2,marginBottom:8}}>{drvOffers.length} conductor{drvOffers.length>1?"es":""} respondieron:</div>}
      {drvOffers.map((dr,i)=><Cd key={i} style={{borderLeft:`4px solid ${dr.offer<=offered?T.gr:T.acc}`}}>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:T.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👨‍✈️</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:T.tx}}>{dr.nm}</div>
            <div style={{fontSize:12,color:T.tx2}}>⭐ {dr.rt} · {dr.tr} viajes · ~{dr.dist} km</div>
            <Bdg bg={T.gr+"22"} fg={T.gr}>✓ ATU · {dr.pl}</Bdg>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20,fontWeight:800,color:dr.offer<=offered?T.gr:T.acc}}>S/ {sf(dr.offer)}</div>
            <div style={{fontSize:11,color:T.tx3}}>{dr.eta} min</div>
          </div>
        </div>
        {dr.offer>offered&&<div style={{fontSize:11,color:T.or,marginBottom:8}}>⚡ Contraoferta: +S/ {sf(dr.offer-offered)} sobre tu precio</div>}
        {dr.offer<=offered&&<div style={{fontSize:11,color:T.gr,marginBottom:8}}>✓ Aceptó tu precio de S/ {sf(offered)}</div>}
        <Btn onClick={()=>{setDrv(dr);setOffered(dr.offer);setEta(dr.eta);setRide("ASGN");setProg(0);nt("🚕 "+dr.nm+" viene en camino!")}}>Aceptar oferta · S/ {sf(dr.offer)}</Btn>
      </Cd>)}
      {drvOffers.length>0&&drvOffers.length<3&&<Cd style={{textAlign:"center",padding:14,border:`1px dashed ${T.bd}`}}>
        <div style={{fontSize:12,color:T.tx3}}>⏳ Esperando más ofertas...</div>
      </Cd>}
    </div>
  </div>);

  if(s==="ride"&&(ride==="ASGN"||ride==="PKUP")&&drv){
    const drvPos={x:orig.x+12,y:orig.y-12};
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
      <Toast/>
      <Map orig={orig} dest={dest} drvPos={drvPos} h={250}/>
      <div style={{padding:"14px 20px"}}>
        <Cd>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <Bdg bg={T.gr+"22"} fg={T.gr}>{ride==="ASGN"?"🚕 En camino":"✅ ¡Llegó!"}</Bdg>
            {ride==="ASGN"&&<span style={{fontSize:24,fontWeight:800,color:T.tx}}>{eta} min</span>}
          </div>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:T.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👨‍✈️</div>
            <div style={{flex:1}}><div style={{fontWeight:700,color:T.tx}}>{drv.nm}</div><div style={{fontSize:12,color:T.tx2}}>⭐ {drv.rt} · {drv.tr} viajes</div></div>
            <Bdg bg={T.gr+"22"} fg={T.gr}>✓ ATU</Bdg>
          </div>
          <div style={{padding:"10px 14px",background:T.card2,borderRadius:10,fontSize:13,color:T.tx2,marginBottom:12}}>{drv.cr} · <b style={{color:T.tx}}>{drv.pl}</b></div>
          <div style={{padding:"8px 14px",background:T.bl+"15",borderRadius:10,fontSize:12,color:T.bl,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:ride==="PKUP"?12:0}}>
            <span>📤 Compartir viaje en vivo</span>
            <button onClick={()=>nt("📤 Enlace compartido")} style={{padding:"4px 10px",borderRadius:6,background:T.bl,color:"#fff",fontSize:11,fontWeight:600,border:"none",cursor:"pointer"}}>Enviar</button>
          </div>
          {ride==="PKUP"&&<Btn onClick={()=>{setRide("GO");setProg(0);nt("🚕 ¡Viaje iniciado!")}}>Iniciar viaje</Btn>}
        </Cd>
      </div>
    </div>)
  }

  if(s==="ride"&&ride==="GO"){
    const drvPos=orig&&dest?{x:orig.x+(dest.x-orig.x)*Math.min(prog,100)/100,y:orig.y+(dest.y-orig.y)*Math.min(prog,100)/100}:null;
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
      <Toast/>
      <Map orig={orig} dest={dest} drvPos={drvPos} h={280}/>
      <div style={{padding:"14px 20px"}}>
        <Cd>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontWeight:700,color:T.tx}}>{orig?.n} → {dest?.n}</span><span style={{fontWeight:700,color:T.acc}}>{Math.round(Math.min(prog,100))}%</span></div>
          <div style={{height:8,borderRadius:4,background:T.card2,marginBottom:14,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${T.bl},${T.gr})`,width:Math.min(prog,100)+"%",transition:"width 1.5s"}}/></div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["S/ "+sf(offered),"Tarifa"],[drv?.nm||"","Conductor"],[drv?.pl||"","Placa"]].map(([v,l],i)=><div key={i} style={{flex:1,textAlign:"center",padding:8,background:T.card2,borderRadius:8}}><div style={{fontSize:13,fontWeight:700,color:T.tx}}>{v}</div><div style={{fontSize:10,color:T.tx3}}>{l}</div></div>)}
          </div>
          <Btn bg={T.rd} fg="#fff" onClick={()=>nt("🚨 SOS — Central notificada")}>🚨 BOTÓN DE PÁNICO</Btn>
        </Cd>
      </div>
    </div>)
  }

  if(s==="ride"&&ride==="DONE"){
    const finalFare=promoApplied?(promoApplied.t==="pct"?Math.round(offered*(1-promoApplied.v)*10)/10:Math.max(0,offered-promoApplied.v)):offered;
    return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg,padding:"40px 20px",textAlign:"center"}}>
    <Toast/>
    <div style={{fontSize:48,marginBottom:12}}>✅</div>
    <div style={{fontSize:20,fontWeight:800,color:T.tx}}>¡Viaje completado!</div>
    {promoApplied&&<div style={{fontSize:13,color:T.acc,marginTop:4}}>🎫 {promoApplied.n} aplicado: {promoApplied.d}</div>}
    {promoApplied&&<div style={{fontSize:14,color:T.tx3,marginTop:2,textDecoration:"line-through"}}>S/ {sf(offered)}</div>}
    <div style={{fontSize:32,fontWeight:900,color:T.acc,marginTop:promoApplied?2:10}}>S/ {sf(finalFare)}</div>
    <div style={{fontSize:13,color:T.tx2,marginTop:4}}>{drv?.nm} · {drv?.pl} · {cat.nm}</div>
    <div style={{marginTop:8}}><Bdg bg={T.card2} fg={T.tx2}>{payMethod==="efectivo"?"💵 Efectivo":payMethod==="yape"?"📱 Yape":"💳 Tarjeta"}</Bdg></div>
    <Cd style={{marginTop:12,background:T.acc+"15"}}><div style={{fontSize:12,color:T.acc}}>🏆 +{Math.round(finalFare*2)} puntos de lealtad</div></Cd>
    <Cd style={{marginTop:4,padding:12,textAlign:"left"}}>
      <div style={{fontSize:11,color:T.tx3,marginBottom:4}}>📄 Boleta electrónica N° {String(Date.now()).slice(-8)}</div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.tx2,marginBottom:2}}><span>Ruta</span><span style={{color:T.tx}}>{orig?.n} → {dest?.n}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.tx2,marginBottom:2}}><span>Servicio</span><span style={{color:T.tx}}>{cat.nm}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.tx2}}><span>Pago</span><span style={{color:T.tx}}>{payMethod==="efectivo"?"Efectivo":payMethod==="yape"?"Yape":"Tarjeta"}</span></div>
      <div style={{fontSize:10,color:T.tx3,marginTop:6,borderTop:`1px solid ${T.bd}`,paddingTop:4}}>ChaskiRutas S.A.C. · RUC 20612345678 · SUNAT</div>
    </Cd>
    <div style={{display:"flex",justifyContent:"center",gap:4,margin:"12px 0"}}>{[1,2,3,4,5].map(v=><button key={v} onClick={()=>setRat(v)} style={{background:"none",border:"none",padding:4,cursor:"pointer",fontSize:30}}>{v<=rat?"⭐":"☆"}</button>)}</div>
    <Btn disabled={!rat} onClick={()=>{setPts(pts+Math.round(finalFare*2));setBk([...bk,{id:Date.now(),tp:"TAXI",o:orig?.n,d:dest?.n,fare:finalFare,drv:drv?.nm,pl:drv?.pl,cat:cat.nm,rat,dt:new Date().toISOString(),pay:payMethod}]);setPromoApplied(null);setPromoCode("");nt("⭐ ¡Gracias! +"+Math.round(finalFare*2)+" pts");reset();setS("home")}}>Enviar calificación</Btn>
  </div>)}

  // ═══════════════════════════════════════════════════════════════════════════
  // COLECTIVO with ANTI-TROLLING SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="col"){
    const joinTrip=colJoin?colT.find(t=>t.tid===colJoin.tid):null;
    // If in join flow, show join process
    if(colJoin&&joinTrip)return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
      <Toast/><Hdr title={"Unirse: Lima → "+joinTrip.dst} back={()=>{setColJoin(null);setColDni("");setColDeposit(false)}}/>
      <div style={{padding:"14px 20px"}}>
        {/* Progress */}
        <div style={{display:"flex",gap:3,marginBottom:16}}>{["verify","deposit","confirm"].map((st,i)=><div key={st} style={{flex:1,height:5,borderRadius:3,background:colJoin.step===st?T.acc:["verify","deposit","confirm"].indexOf(colJoin.step)>i?T.gr:T.card2}}/>)}</div>

        {/* Step 1: Identity verification */}
        {colJoin.step==="verify"&&<>
          <Cd style={{textAlign:"center",padding:20}}>
            <div style={{fontSize:28,marginBottom:8}}>🪪</div>
            <div style={{fontSize:16,fontWeight:700,color:T.tx}}>Verificación de identidad</div>
            <div style={{fontSize:12,color:T.tx2,marginTop:4}}>Para tu seguridad y la de los demás pasajeros, necesitamos verificar tu DNI antes de reservar</div>
          </Cd>
          <Cd style={{padding:14}}>
            <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:8}}>Ingresa tu DNI (8 dígitos)</div>
            <input placeholder="12345678" inputMode="numeric" value={colDni} onChange={e=>{const v=e.target.value.replace(/\D/g,"");if(v.length<=8)setColDni(v)}} style={{width:"100%",padding:"14px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:18,fontWeight:700,outline:"none",boxSizing:"border-box",textAlign:"center",letterSpacing:"4px"}}/>
            {colDni.length===8&&<Cd style={{marginTop:10,background:T.gr+"15",padding:10}}>
              <div style={{fontSize:12,color:T.gr}}>✅ DNI válido · Verificado con RENIEC</div>
            </Cd>}
          </Cd>
          <Btn disabled={colDni.length<8} onClick={()=>{setColJoin({...colJoin,step:"deposit"});nt("✅ Identidad verificada")}}>Verificar y continuar</Btn>
        </>}

        {/* Step 2: Deposit / Guarantee */}
        {colJoin.step==="deposit"&&<>
          <Cd style={{textAlign:"center",padding:20}}>
            <div style={{fontSize:28,marginBottom:8}}>💰</div>
            <div style={{fontSize:16,fontWeight:700,color:T.tx}}>Depósito de garantía</div>
            <div style={{fontSize:12,color:T.tx2,marginTop:4}}>Para evitar reservas falsas, se requiere un depósito del <b style={{color:T.acc}}>30%</b> del pasaje</div>
          </Cd>
          <Cd style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13,color:T.tx2}}><span>Tarifa completa</span><span style={{color:T.tx}}>S/ {sf(joinTrip.f)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:14,fontWeight:700,color:T.acc}}><span>Depósito 30%</span><span>S/ {sf(Math.round(joinTrip.f*.3*10)/10)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:13,color:T.tx2}}><span>Restante al abordar</span><span style={{color:T.tx}}>S/ {sf(joinTrip.f-Math.round(joinTrip.f*.3*10)/10)}</span></div>
            <div style={{padding:"10px 14px",background:T.or+"15",borderRadius:10,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:T.or,marginBottom:4}}>📋 Política de cancelación</div>
              <div style={{fontSize:11,color:T.tx2,lineHeight:1.6}}>
                • 5 o más días antes: <b style={{color:T.gr}}>reembolso total del depósito</b><br/>
                • Menos de 5 días: <b style={{color:T.rd}}>sin reembolso automático</b> — contactar a Atención al Cliente<br/>
                • No-show: <b style={{color:T.rd}}>depósito no reembolsable</b> + penalización en rating
              </div>
              <div style={{fontSize:10,color:T.tx3,marginTop:6}}>Consulta los Términos y Condiciones completos en Configuración</div>
            </div>
            {/* Payment method for deposit */}
            <div style={{fontSize:12,fontWeight:600,color:T.tx2,marginBottom:6}}>Pagar depósito con:</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[{id:"yape",ic:"📱",nm:"Yape"},{id:"tarjeta",ic:"💳",nm:"Tarjeta"}].map(p=>
                <button key={p.id} onClick={()=>{setColDeposit(true);nt("💰 Depósito de S/ "+sf(Math.round(joinTrip.f*.3*10)/10)+" procesado")}} style={{flex:1,padding:"12px 8px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.card,cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:18}}>{p.ic}</div>
                  <div style={{fontSize:11,color:T.tx2,marginTop:2}}>{p.nm}</div>
                </button>
              )}
            </div>
            {colDeposit&&<Cd style={{background:T.gr+"15",padding:10}}><div style={{fontSize:12,color:T.gr}}>✅ Depósito procesado exitosamente</div></Cd>}
          </Cd>
          <Btn disabled={!colDeposit} onClick={()=>{setColJoin({...colJoin,step:"confirm"});nt("✅ Depósito confirmado")}}>Confirmar depósito</Btn>
        </>}

        {/* Step 3: Final confirmation */}
        {colJoin.step==="confirm"&&<>
          <Cd style={{textAlign:"center",padding:20}}>
            <div style={{fontSize:28,marginBottom:8}}>✅</div>
            <div style={{fontSize:16,fontWeight:700,color:T.tx}}>Confirmar reserva</div>
          </Cd>
          <Cd style={{padding:14}}>
            <div style={{fontSize:13,color:T.tx2,lineHeight:1.8}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Ruta</span><span style={{color:T.tx,fontWeight:600}}>Lima → {joinTrip.dst}</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Fecha</span><span style={{color:T.tx,fontWeight:600}}>{joinTrip.dp}</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Hora</span><span style={{color:T.tx,fontWeight:600}}>{joinTrip.hr}</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Depósito pagado</span><span style={{color:T.gr,fontWeight:600}}>S/ {sf(Math.round(joinTrip.f*.3*10)/10)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Restante al abordar</span><span style={{color:T.acc,fontWeight:600}}>S/ {sf(joinTrip.f-Math.round(joinTrip.f*.3*10)/10)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>DNI verificado</span><span style={{color:T.gr,fontWeight:600}}>✓ {colDni}</span></div>
            </div>
          </Cd>
          <Cd style={{background:T.bl+"15",padding:12}}>
            <div style={{fontSize:12,color:T.bl}}>⏰ Recibirás una notificación <b>1 hora antes</b> del viaje para confirmar tu asistencia. Si no confirmas, se libera tu asiento y pierdes el depósito.</div>
          </Cd>
          <Cd style={{background:T.acc+"15",padding:12}}>
            <div style={{fontSize:12,color:T.acc}}>🔒 El viaje se confirma cuando se alcancen mínimo <b>3 de {joinTrip.st}</b> pasajeros verificados con depósito.</div>
          </Cd>
          <Btn onClick={()=>{
            joinTrip.jn++;if(joinTrip.jn>=joinTrip.st)joinTrip.ok=false;setColT([...colT]);
            setBk([...bk,{id:Date.now(),tp:"COL",d:joinTrip.dst,fare:joinTrip.f,dt:new Date().toISOString(),deposit:Math.round(joinTrip.f*.3*10)/10}]);
            setPts(pts+Math.round(joinTrip.f*2));
            nt("🚐 ¡Reserva confirmada! Asiento #"+joinTrip.jn+" · Depósito asegurado");
            setColJoin(null);setColDni("");setColDeposit(false);
          }}>🚐 Confirmar reserva</Btn>
        </>}
      </div>
    </div>);

    // Main colectivo listing
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg,paddingBottom:80}}>
      <Toast/><Hdr title="🚐 Ciudad a Ciudad" sub="Colectivo legal a provincia — DRTC" back={()=>setS("home")}/>
      <div style={{padding:"14px 20px"}}>
        <Cd style={{background:T.gr+"15",border:`1px solid ${T.gr}33`,padding:12}}>
          <div style={{fontSize:12,color:T.gr,lineHeight:1.5}}><b>Solo en provincia.</b> Colectivo prohibido en Lima/Callao (jurisdicción ATU). El sistema bloquea automáticamente.</div>
        </Cd>
        <Cd style={{background:T.bl+"15",border:`1px solid ${T.bl}33`,padding:12}}>
          <div style={{fontSize:12,color:T.bl,lineHeight:1.5}}>🔒 <b>Sistema antifraude:</b> DNI verificado + depósito 30% + política de cancelación + confirmación 1h antes. Sin trolleo.</div>
        </Cd>
        {/* Create colectivo - DUAL FLOW */}
        <Cd style={{padding:14}}>
          <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:10}}>Publicar un viaje</div>
          {/* Mode selector */}
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <button onClick={()=>setNewCol({...newCol,mode:"driver"})} style={{flex:1,padding:"10px 8px",borderRadius:10,border:`2px solid ${(newCol.mode||"driver")==="driver"?T.acc:T.bd}`,background:(newCol.mode||"driver")==="driver"?T.acc+"15":"transparent",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:18}}>🚗</div><div style={{fontSize:11,fontWeight:600,color:(newCol.mode||"driver")==="driver"?T.acc:T.tx2,marginTop:2}}>Soy conductor</div><div style={{fontSize:10,color:T.tx3}}>Ofrezco mi unidad</div>
            </button>
            <button onClick={()=>setNewCol({...newCol,mode:"passenger"})} style={{flex:1,padding:"10px 8px",borderRadius:10,border:`2px solid ${newCol.mode==="passenger"?T.bl:T.bd}`,background:newCol.mode==="passenger"?T.bl+"15":"transparent",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:18}}>👤</div><div style={{fontSize:11,fontWeight:600,color:newCol.mode==="passenger"?T.bl:T.tx2,marginTop:2}}>Soy pasajero</div><div style={{fontSize:10,color:T.tx3}}>Propongo destino</div>
            </button>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input placeholder="Destino (Cusco, Ica...)" value={newCol.d} onChange={e=>setNewCol({...newCol,d:e.target.value})} style={{flex:2,padding:"10px 12px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.card2,color:T.tx,fontSize:13,outline:"none"}}/>
            <input type="number" placeholder="S/" value={newCol.fare} onChange={e=>setNewCol({...newCol,fare:e.target.value})} style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.card2,color:T.tx,fontSize:13,outline:"none"}}/>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input type="date" value={newCol.date} onChange={e=>setNewCol({...newCol,date:e.target.value})} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.card2,color:T.tx,fontSize:12,outline:"none"}}/>
            <input type="time" value={newCol.time} onChange={e=>setNewCol({...newCol,time:e.target.value})} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.card2,color:T.tx,fontSize:12,outline:"none"}}/>
          </div>
          {newCol.mode==="passenger"&&<Cd style={{background:T.bl+"15",padding:10,marginBottom:8}}>
            <div style={{fontSize:11,color:T.bl}}>👤 Tu propuesta será visible para conductores. Cuando uno acepte, el viaje se activa y otros pasajeros podrán unirse con depósito.</div>
          </Cd>}
          <Btn bg={newCol.mode==="passenger"?T.bl:T.gr} fg="#fff" onClick={()=>{
            if(!newCol.d||!newCol.date||!newCol.fare){nt("Completa todos los campos");return}
            if(["lima","callao"].some(x=>newCol.d.toLowerCase().includes(x))){nt("🚫 BLOQUEADO: Colectivo prohibido en Lima/Callao");return}
            const tipo=newCol.mode==="passenger"?"propuesta":"oferta";
            setColT([{tid:300+colT.length,dst:newCol.d,pr:newCol.d,f:parseFloat(newCol.fare),du:"?",km:"-",st:4,hr:newCol.time,dp:newCol.date,jn:newCol.mode==="passenger"?1:0,ok:true,tipo,by:u?.nm||"Anónimo"},...colT]);
            setNewCol({d:"",date:"",time:"06:00",fare:"",mode:"driver"});nt("🚐 ¡"+tipo.charAt(0).toUpperCase()+tipo.slice(1)+" publicada!");
          }} style={{padding:"10px"}}>{newCol.mode==="passenger"?"Proponer viaje (buscar conductor)":"Publicar como conductor"}</Btn>
        </Cd>
        {/* Available trips */}
        <div style={{fontSize:14,fontWeight:700,color:T.tx,margin:"12px 0 8px"}}>Viajes disponibles</div>
        {colT.filter(t=>t.ok&&t.jn<t.st).map(t=><Cd key={t.tid}>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <Bdg bg={T.gr+"22"} fg={T.gr}>{t.pr}</Bdg>
            {t.tipo==="propuesta"&&<Bdg bg={T.bl+"22"} fg={T.bl}>👤 Propuesta</Bdg>}
            {t.tipo==="oferta"&&<Bdg bg={T.acc+"22"} fg={T.acc}>🚗 Conductor</Bdg>}
            {!t.tipo&&<Bdg bg={T.card2} fg={T.tx3}>Disponible</Bdg>}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
            <div><div style={{fontWeight:700,color:T.tx}}>Lima → {t.dst}</div><div style={{fontSize:12,color:T.tx2,marginTop:3}}>📅 {t.dp} · 🕐 {t.hr} · {t.du}{t.km!=="-"?" · "+t.km+" km":""}</div>
            {t.by&&<div style={{fontSize:11,color:T.tx3,marginTop:2}}>Publicado por: {t.by}</div>}</div>
            <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:T.acc}}>S/{t.f}</div><div style={{fontSize:11,color:T.tx3}}>{t.st-t.jn} libres</div></div>
          </div>
          <div style={{display:"flex",gap:4,marginTop:8}}>{Array.from({length:t.st},(_,i)=><div key={i} style={{width:28,height:28,borderRadius:7,background:i<t.jn?T.gr:T.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:i<t.jn?"#fff":T.tx3}}>{i<t.jn?"👤":"·"}</div>)}</div>
          <div style={{display:"flex",gap:6,marginTop:10,fontSize:11,color:T.tx3}}>
            <span>🔒 DNI verificado</span><span>·</span><span>💰 Depósito 30%: S/{sf(Math.round(t.f*.3*10)/10)}</span>
          </div>
          <Btn onClick={()=>setColJoin({tid:t.tid,step:"verify"})} style={{marginTop:10,padding:"10px"}}>Reservar asiento · S/ {sf(Math.round(t.f*.3*10)/10)} depósito</Btn>
        </Cd>)}
      </div>
    </div>)}

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIPS
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="trips")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg,paddingBottom:80}}>
    <Toast/><Hdr title={"Mis viajes ("+bk.length+")"} sub={"🏆 "+pts+" pts · "+(pts>=500?"Platino":pts>=200?"Oro":"Plata")} back={()=>setS(u?.rl==="pasajero"?"home":"drv")}/>
    <div style={{padding:"14px 20px"}}>
      {!bk.length&&<div style={{textAlign:"center",padding:48,color:T.tx3}}><div style={{fontSize:48}}>🚕</div><p>Sin viajes aún</p></div>}
      {bk.map(b=><Cd key={b.id} style={{borderLeft:`4px solid ${b.tp==="TAXI"?T.acc:T.gr}`}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <div><Bdg bg={b.tp==="TAXI"?T.acc+"22":T.gr+"22"} fg={b.tp==="TAXI"?T.acc:T.gr}>{b.tp==="TAXI"?"🚕 "+( b.cat||"TAXI"):"🚐 COL."}</Bdg>{b.sc&&<Bdg bg={T.or+"22"} fg={T.or}> 📅</Bdg>}
          <div style={{fontWeight:700,color:T.tx,marginTop:6}}>{b.o?b.o+" → "+b.d:b.d||""}</div>
          <div style={{fontSize:12,color:T.tx2,marginTop:3}}>{b.drv||""}{b.pl?" · "+b.pl:""}</div>
          {b.rat>0&&<div style={{marginTop:4}}>{"⭐".repeat(b.rat)}</div>}</div>
          <div style={{textAlign:"right"}}><div style={{fontWeight:800,color:T.acc,fontSize:16}}>S/ {sf(b.fare||0)}</div></div>
        </div>
      </Cd>)}
    </div>
  </div>);

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIVER
  // ═══════════════════════════════════════════════════════════════════════════
  if(s==="drv")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
    <Toast/>
    <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${T.bd}`}}>
      <button onClick={()=>setS("menu")} style={{background:T.card,border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",color:T.tx,fontSize:16}}>☰</button>
      <div style={{display:"flex",gap:5}}>
        <button onClick={()=>setS("drvForm")} style={{padding:"8px 12px",borderRadius:10,fontSize:11,fontWeight:700,background:T.card,color:T.tx2,border:"none",cursor:"pointer"}}>🛡️ {fs}/6</button>
        <button onClick={()=>setS("expenses")} style={{padding:"8px 12px",borderRadius:10,fontSize:11,fontWeight:700,background:T.card,color:T.tx2,border:"none",cursor:"pointer"}}>💰</button>
        <button onClick={()=>setS("settlement")} style={{padding:"8px 12px",borderRadius:10,fontSize:11,fontWeight:700,background:T.card,color:T.tx2,border:"none",cursor:"pointer"}}>📊</button>
        <button onClick={()=>setS("trips")} style={{padding:"8px 12px",borderRadius:10,fontSize:11,fontWeight:700,background:T.card,color:T.tx2,border:"none",cursor:"pointer"}}>📋</button>
      </div>
    </div>
    <Map reqs={online?dReqs:[]} drvPos={{x:200,y:205}} h={250}/>
    <div style={{padding:"14px 20px"}}>
      <Cd style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontWeight:700,color:T.tx,fontSize:15}}>{online?"🟢 En línea":"🔴 Desconectado"}</div><div style={{fontSize:12,color:T.tx2}}>{online?dReqs.length+" solicitudes":"Activa para recibir"}</div></div>
        <button onClick={()=>{if(fs<6){nt("⚠️ Completa formalización ATU");return}setOnline(!online);setDReqs([]);nt(online?"Desconectado":"🟢 ¡En línea!")}} style={{width:56,height:30,borderRadius:15,background:online?T.gr:T.card2,position:"relative",border:"none",cursor:"pointer"}}><div style={{width:22,height:22,borderRadius:"50%",background:"#fff",position:"absolute",top:4,left:online?30:4,transition:"left .3s"}}/></button>
      </Cd>
      {fs<6&&<Cd style={{borderLeft:`4px solid ${T.rd}`}} onClick={()=>setS("drvForm")}><div style={{fontWeight:700,color:T.rd,fontSize:13}}>⚠️ Formalízate — Paso {fs}/6</div><div style={{fontSize:11,color:T.tx2}}>Sin TUC = multa + retención</div></Cd>}
      {/* Document expiry alerts */}
      {docs.filter(d=>d.dias<30).map((d,i)=><Cd key={i} style={{borderLeft:`4px solid ${T.or}`,padding:12}} onClick={()=>setS("docs")}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,color:T.or,fontWeight:600}}>🔔 {d.nm} vence en {d.dias} días</div>
          <Bdg bg={T.or+"22"} fg={T.or}>{d.vence}</Bdg>
        </div>
      </Cd>)}
      {dRide&&<Cd style={{borderLeft:`4px solid ${dPh==="PKUP"?T.or:T.bl}`}}>
        <div style={{fontWeight:700,color:T.tx}}>{dRide.oN} → {dRide.dN}</div>
        <div style={{fontSize:12,color:T.tx2,marginTop:3}}>👤 {dRide.pax} · {dRide.km} km · ~{dRide.mn} min</div>
        <div style={{fontSize:14,fontWeight:700,color:T.acc,marginTop:4}}>Ganancia: S/ {sf(dRide.net)}</div>
        {dPh==="PKUP"&&<Btn bg={T.bl} fg="#fff" onClick={()=>{setDPh("GO");nt("🚕 Viaje iniciado")}} style={{marginTop:10,padding:"10px"}}>Iniciar viaje</Btn>}
        {dPh==="GO"&&<Btn onClick={()=>{setDPh("RATE_PAX")}} style={{marginTop:10,padding:"10px"}}>Completar viaje</Btn>}
        {dPh==="RATE_PAX"&&<div style={{marginTop:12}}>
          <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:6}}>Califica al pasajero:</div>
          <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:10}}>
            {[1,2,3,4,5].map(v=><button key={v} onClick={()=>setDrvRatPax(v)} style={{background:"none",border:"none",padding:2,cursor:"pointer",fontSize:24}}>{v<=drvRatPax?"⭐":"☆"}</button>)}
          </div>
          <Btn disabled={!drvRatPax} onClick={()=>{
            const earn=Math.round((dRide.fare||0)*.85*10)/10;
            const receipt={id:Date.now(),fecha:new Date().toISOString(),o:dRide.oN,d:dRide.dN,fare:dRide.fare,net:earn,pax:dRide.pax,paxRat:drvRatPax,pay:"efectivo"};
            setBk([...bk,{id:Date.now(),tp:"TAXI",o:dRide.oN,d:dRide.dN,fare:dRide.fare,drv:u?.nm,pl:u?.pl,dt:new Date().toISOString(),paxRat:drvRatPax}]);
            setShowReceipt(receipt);
            nt("✅ S/ "+sf(earn)+" ganados · Pasajero calificado");setDRide(null);setDPh("IDLE");setDrvRatPax(0);
          }} style={{padding:"10px"}}>Enviar y cobrar S/ {sf(Math.round((dRide?.fare||0)*.85*10)/10)}</Btn>
        </div>}
      </Cd>}
      {online&&!dRide&&dReqs.slice(0,3).map(r=><Cd key={r.id} style={{borderLeft:`4px solid ${T.acc}`}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div><div style={{fontWeight:700,color:T.tx,fontSize:14}}>{r.oN} → {r.dN}</div><div style={{fontSize:12,color:T.tx2,marginTop:2}}>👤 {r.pax} · ⭐ {r.pR} · {r.km} km · ~{r.mn} min</div>
          <div style={{marginTop:4}}><Bdg bg={T.gr+"22"} fg={T.gr}>💵 Efectivo</Bdg></div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:T.acc}}>S/ {sf(r.fare)}</div><div style={{fontSize:10,color:T.tx3}}>Neto: S/ {sf(r.net)}</div></div>
        </div>
        {/* Accept at passenger price */}
        <Btn onClick={()=>{setDRide(r);setDPh("PKUP");setDReqs([]);nt("✅ Aceptado por S/ "+sf(r.fare))}} style={{padding:"12px",marginBottom:8}}>Aceptar por S/ {sf(r.fare)}</Btn>
        {/* Counter-offer buttons (InDrive style) */}
        <div style={{fontSize:12,color:T.tx3,textAlign:"center",marginBottom:6}}>Ofrece tu tarifa</div>
        <div style={{display:"flex",gap:6}}>
          {[1.1,1.2,1.35].map((m,i)=>{const co=Math.round(r.fare*m*10)/10;return <button key={i} onClick={()=>{const nr={...r,fare:co,net:Math.round(co*.85*10)/10};setDRide(nr);setDPh("PKUP");setDReqs([]);nt("✅ Contraoferta S/ "+sf(co)+" enviada")}} style={{flex:1,padding:"10px 8px",borderRadius:10,background:T.acc+"22",border:`1px solid ${T.acc}`,cursor:"pointer",textAlign:"center",fontSize:14,fontWeight:700,color:T.acc}}>S/ {sf(co)}</button>})}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}><button onClick={()=>setDReqs(dReqs.filter(x=>x.id!==r.id))} style={{padding:"6px 14px",borderRadius:8,background:T.card2,border:"none",cursor:"pointer",color:T.tx3,fontSize:12}}>Ignorar oferta ✕</button></div>
      </Cd>)}
    </div>
  </div>);

  // ═══ SIDEBAR MENU (InDrive-style) ══════════════════════════════════════════
  if(s==="menu")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
    <div style={{padding:"24px 20px",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:T.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{u?.em||"👤"}</div>
        <div><div style={{fontSize:18,fontWeight:700,color:T.tx}}>{u?.nm}</div><div style={{fontSize:13,color:T.acc}}>⭐ {u?.rt||"4.60"} ({u?.tr||"43"})</div></div>
      </div>
    </div>
    {[
      {ic:"🚗",nm:"Ciudad (Taxi)",sc:u?.rl==="conductor"?"drv":"home",roles:["pasajero","conductor"]},
      {ic:"📋",nm:"Historial de viajes",sc:"trips",roles:["pasajero","conductor"]},
      {ic:"🚐",nm:"Ciudad a Ciudad (Colectivo)",sc:"col",roles:["pasajero","conductor"]},
      {ic:"💰",nm:"Gastos y finanzas",sc:"expenses",roles:["conductor"]},
      {ic:"📄",nm:"Boletas / Recibos",sc:"receipts",roles:["pasajero","conductor"]},
      {ic:"💵",nm:"Liquidación semanal",sc:"settlement",roles:["conductor"]},
      {ic:"📑",nm:"Mis documentos",sc:"docs",roles:["conductor"]},
      {ic:"🛡️",nm:"Formalización ATU",sc:"drvForm",roles:["conductor"]},
      {ic:"🎁",nm:"Referir amigos",sc:"referral",roles:["pasajero","conductor"]},
      {ic:"🔔",nm:"Notificaciones",sc:"home",roles:["pasajero","conductor"]},
      {ic:"🛡️",nm:"Seguridad",sc:"home",roles:["pasajero","conductor"]},
      {ic:"⚙️",nm:"Configuración",sc:"home",roles:["pasajero","conductor"]},
      {ic:"❓",nm:"Ayuda",sc:"home",roles:["pasajero","conductor"]},
    ].filter(item=>item.roles.includes(u?.rl||"pasajero")).map((item,i)=><button key={i} onClick={()=>setS(item.sc)} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderBottom:`1px solid ${T.bd}`,background:"transparent",border:"none",borderBottomStyle:"solid",borderBottomColor:T.bd,cursor:"pointer",color:T.tx,textAlign:"left"}}>
      <span style={{fontSize:18,width:28,textAlign:"center"}}>{item.ic}</span>
      <span style={{fontSize:15,fontWeight:500}}>{item.nm}</span>
      {item.nm.includes("Notif")&&<span style={{marginLeft:"auto",width:20,height:20,borderRadius:"50%",background:T.rd,color:"#fff",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>3</span>}
    </button>)}
    <div style={{padding:"16px 20px"}}>
      <Btn bg={T.acc} fg="#000" onClick={()=>setS(u?.rl==="conductor"?"drv":"home")}>{u?.rl==="conductor"?"Modo conductor":"Modo pasajero"}</Btn>
      <button onClick={()=>{setU(null);reset();setOnline(false);setS("splash")}} style={{width:"100%",padding:"14px",marginTop:8,background:"transparent",border:`1px solid ${T.rd}`,borderRadius:12,color:T.rd,fontSize:14,fontWeight:600,cursor:"pointer"}}>Cerrar sesión</button>
    </div>
  </div>);

  // ═══ EXPENSES (Gastos del conductor) ═══════════════════════════════════════
  if(s==="expenses"){
    const inc=bk.filter(b=>b.tp==="TAXI").reduce((a,b)=>a+(Number(b.fare)||0)*0.85,0);
    const totE=expenses.reduce((a,e)=>a+e.m,0);
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
      <Toast/><Hdr title="Gastos y finanzas" back={()=>setS(u?.rl==="conductor"?"drv":"menu")}/>
      <div style={{padding:"14px 20px"}}>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <Cd style={{flex:1,textAlign:"center",padding:12,borderTop:`3px solid ${T.gr}`}}><div style={{fontSize:10,color:T.tx3}}>Ingresos</div><div style={{fontSize:20,fontWeight:800,color:T.gr}}>S/{sf(inc,0)}</div></Cd>
          <Cd style={{flex:1,textAlign:"center",padding:12,borderTop:`3px solid ${T.rd}`}}><div style={{fontSize:10,color:T.tx3}}>Gastos</div><div style={{fontSize:20,fontWeight:800,color:T.rd}}>S/{sf(totE,0)}</div></Cd>
          <Cd style={{flex:1,textAlign:"center",padding:12,borderTop:`3px solid ${T.acc}`}}><div style={{fontSize:10,color:T.tx3}}>Neto</div><div style={{fontSize:20,fontWeight:800,color:T.acc}}>S/{sf(inc-totE,0)}</div></Cd>
        </div>
        <Cd style={{padding:14}}>
          <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:10}}>Registrar gasto</div>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {["Combustible","Peaje","Lavado","Mantenimiento"].map(t=><button key={t} onClick={()=>setExpT(t)} style={{padding:"8px 12px",borderRadius:8,fontSize:12,fontWeight:600,border:"none",background:expT===t?T.acc:T.card2,color:expT===t?"#000":T.tx2,cursor:"pointer"}}>{t}</button>)}
          </div>
          <input type="number" placeholder="Monto S/" value={expA} onChange={e=>setExpA(e.target.value)} style={{width:"100%",padding:"12px 16px",borderRadius:12,border:`1px solid ${T.bd}`,background:T.card,color:T.tx,fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
          <Btn onClick={()=>{if(!expA)return;setExpenses([{id:Date.now(),t:expT,m:parseFloat(expA),d:new Date().toISOString().split("T")[0]},...expenses]);setExpA("");nt("💰 Gasto registrado")}}>Registrar</Btn>
        </Cd>
        <div style={{fontSize:14,fontWeight:700,color:T.tx,marginBottom:10,marginTop:16}}>Historial</div>
        {expenses.map(e=><Cd key={e.id} style={{display:"flex",justifyContent:"space-between",padding:12}}>
          <div><div style={{fontWeight:600,color:T.tx,fontSize:13}}>{e.t}</div><div style={{fontSize:11,color:T.tx3}}>{e.d}</div></div>
          <div style={{fontWeight:700,color:T.rd,fontSize:14}}>-S/{sf(e.m)}</div>
        </Cd>)}
      </div>
    </div>)}

  // ═══ RECEIPT / BOLETA ══════════════════════════════════════════════════════
  if(s==="receipts")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
    <Toast/><Hdr title="📄 Boletas / Recibos" back={()=>setS("menu")}/>
    <div style={{padding:"14px 20px"}}>
      {bk.filter(b=>b.tp==="TAXI").length===0&&<div style={{textAlign:"center",padding:48,color:T.tx3}}><div style={{fontSize:36}}>📄</div><p>Sin boletas aún</p></div>}
      {bk.filter(b=>b.tp==="TAXI").map(b=><Cd key={b.id}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:10}}>
          <div><div style={{fontWeight:700,color:T.tx}}>Boleta electrónica</div><div style={{fontSize:11,color:T.tx3,marginTop:2}}>N° {String(b.id).slice(-8)} · SUNAT</div></div>
          <Bdg bg={T.gr+"22"} fg={T.gr}>Emitida</Bdg>
        </div>
        <div style={{padding:"10px 14px",background:T.card2,borderRadius:10,fontSize:12,color:T.tx2,marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span>Ruta</span><span style={{color:T.tx}}>{b.o} → {b.d}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span>Conductor</span><span style={{color:T.tx}}>{b.drv||"-"}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span>Placa</span><span style={{color:T.tx}}>{b.pl||"-"}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span>Fecha</span><span style={{color:T.tx}}>{new Date(b.dt).toLocaleDateString("es-PE")}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,borderTop:`1px solid ${T.bd}`,paddingTop:6,marginTop:4}}><span style={{color:T.tx}}>Total</span><span style={{color:T.acc}}>S/ {sf(b.fare||0)}</span></div>
        </div>
        <div style={{fontSize:11,color:T.tx3,textAlign:"center"}}>ChaskiRutas S.A.C. · RUC: 20612345678</div>
      </Cd>)}
    </div>
  </div>);

  // ═══ WEEKLY SETTLEMENT (Liquidación semanal) ═══════════════════════════════
  if(s==="settlement"){
    const taxiTrips=bk.filter(b=>b.tp==="TAXI");
    const grossInc=taxiTrips.reduce((a,b)=>a+(Number(b.fare)||0),0);
    const commission=Math.round(grossInc*0.15*10)/10;
    const netInc=grossInc-commission;
    const totExp=expenses.reduce((a,e)=>a+e.m,0);
    const profit=netInc-totExp;
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
      <Toast/><Hdr title="💵 Liquidación semanal" back={()=>setS("menu")}/>
      <div style={{padding:"14px 20px"}}>
        <Cd style={{textAlign:"center",padding:20,background:`linear-gradient(135deg,${T.card},${T.card2})`}}>
          <div style={{fontSize:12,color:T.tx3}}>Ganancia neta de la semana</div>
          <div style={{fontSize:36,fontWeight:900,color:T.acc,marginTop:4}}>S/ {sf(profit)}</div>
        </Cd>
        <Cd style={{padding:14}}>
          <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:10}}>Desglose</div>
          {[
            ["Viajes realizados",taxiTrips.length,""],
            ["Ingreso bruto","S/ "+sf(grossInc),T.tx],
            ["Comisión ChaskiRutas (15%)","-S/ "+sf(commission),T.rd],
            ["Ingreso neto","S/ "+sf(netInc),T.gr],
            ["Total gastos operativos","-S/ "+sf(totExp),T.rd],
            ["GANANCIA FINAL","S/ "+sf(profit),T.acc],
          ].map(([l,v,c],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<5?`1px solid ${T.bd}`:"none",fontSize:i===5?14:13,fontWeight:i===5?700:400}}>
            <span style={{color:T.tx2}}>{l}</span><span style={{color:c||T.tx,fontWeight:i>=3?700:400}}>{v}</span>
          </div>)}
        </Cd>
        <Cd style={{background:T.acc+"15",padding:12}}>
          <div style={{fontSize:12,color:T.acc}}>📅 Liquidación automática cada lunes a tu cuenta bancaria registrada</div>
        </Cd>
      </div>
    </div>)}

  // ═══ DOCUMENT ALERTS ═══════════════════════════════════════════════════════
  if(s==="docs")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
    <Toast/><Hdr title="📑 Mis documentos" sub="Alertas de vencimiento" back={()=>setS("menu")}/>
    <div style={{padding:"14px 20px"}}>
      {docs.map((d,i)=><Cd key={i} style={{borderLeft:`4px solid ${d.dias<30?T.rd:d.dias<90?T.or:T.gr}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:700,color:T.tx,fontSize:14}}>{d.nm}</div>
            <div style={{fontSize:12,color:T.tx2,marginTop:2}}>Vence: {d.vence}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <Bdg bg={d.dias<30?T.rd+"22":d.dias<90?T.or+"22":T.gr+"22"} fg={d.dias<30?T.rd:d.dias<90?T.or:T.gr}>
              {d.dias<30?"⚠️ "+d.dias+" días":d.dias<90?"🔔 "+d.dias+" días":"✓ "+d.dias+" días"}
            </Bdg>
          </div>
        </div>
        {d.dias<30&&<div style={{marginTop:8,padding:"8px 12px",background:T.rd+"15",borderRadius:8,fontSize:12,color:T.rd}}>⚠️ Documento próximo a vencer. Renueva antes de {d.vence} para evitar suspensión.</div>}
      </Cd>)}
      <Btn onClick={()=>nt("📤 Documento subido exitosamente")}>Subir documento nuevo</Btn>
    </div>
  </div>);

  // ═══ REFERRAL SYSTEM ═══════════════════════════════════════════════════════
  if(s==="referral")return(
  <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
    <Toast/><Hdr title="🎁 Referir amigos" back={()=>setS("menu")}/>
    <div style={{padding:"14px 20px"}}>
      <Cd style={{textAlign:"center",padding:24,background:`linear-gradient(135deg,${T.card},${T.card2})`}}>
        <div style={{fontSize:40,marginBottom:12}}>🎁</div>
        <div style={{fontSize:18,fontWeight:800,color:T.tx}}>¡Invita y gana!</div>
        <div style={{fontSize:13,color:T.tx2,marginTop:6,lineHeight:1.5}}>Comparte tu código con amigos. Ambos ganan <b style={{color:T.acc}}>S/ 10</b> cuando completen su primer viaje.</div>
      </Cd>
      <Cd style={{textAlign:"center",padding:20}}>
        <div style={{fontSize:12,color:T.tx3,marginBottom:6}}>Tu código de referido</div>
        <div style={{fontSize:28,fontWeight:900,color:T.acc,letterSpacing:"2px"}}>{referralCode}</div>
        <button onClick={()=>nt("📋 Código copiado: "+referralCode)} style={{marginTop:12,padding:"10px 24px",borderRadius:10,background:T.acc,color:"#000",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"}}>Copiar código</button>
      </Cd>
      <Cd style={{padding:14}}>
        <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:10}}>¿Cómo funciona?</div>
        {[["1️⃣","Comparte tu código con un amigo"],["2️⃣","Tu amigo se registra con el código"],["3️⃣","Cuando complete su primer viaje, ambos reciben S/10"],["4️⃣","Sin límite de referidos"]].map(([n,t],i)=>
          <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0"}}><span style={{fontSize:16}}>{n}</span><span style={{fontSize:13,color:T.tx2}}>{t}</span></div>
        )}
      </Cd>
      <div style={{display:"flex",gap:8}}>
        <Btn bg={T.gr} fg="#fff" onClick={()=>nt("📤 Compartido por WhatsApp")} style={{flex:1}}>WhatsApp</Btn>
        <Btn bg={T.bl} fg="#fff" onClick={()=>nt("📤 Compartido")} style={{flex:1}}>Compartir</Btn>
      </div>
    </div>
  </div>);
  if(s==="drvForm"){
    const stepData=[
      {n:1,t:"Verificación de identidad",d:"DNI + selfie biométrico",reqs:[
        {k:"dni_f",l:"📸 Foto DNI (frontal)",done:fDocs.dni_f},
        {k:"dni_b",l:"📸 Foto DNI (reverso)",done:fDocs.dni_b},
        {k:"selfie",l:"🤳 Selfie de verificación",done:fDocs.selfie},
      ]},
      {n:2,t:"Documentos personales",d:"Licencia de conducir + antecedentes",reqs:[
        {k:"lic",l:"📄 Licencia de conducir (A-IIA / A-IIB)",done:fDocs.lic},
        {k:"antec",l:"📋 Certificado de antecedentes penales y policiales",done:fDocs.antec},
      ]},
      {n:3,t:"Documentos del vehículo",d:"SOAT + CITV + tarjeta de propiedad",reqs:[
        {k:"soat",l:"🛡️ SOAT vigente (póliza escaneada)",done:fDocs.soat},
        {k:"citv",l:"🔧 Certificado CITV aprobado",done:fDocs.citv},
        {k:"tprop",l:"📑 Tarjeta de propiedad del vehículo",done:fDocs.tprop},
      ]},
      {n:4,t:"Contrato de afiliación",d:"Lectura y firma digital del contrato ChaskiRutas",reqs:[
        {k:"terms",l:"📖 He leído y acepto los términos y condiciones",done:fDocs.terms},
        {k:"firma",l:"✍️ Firma digital del contrato de afiliación",done:fDocs.firma},
      ]},
      {n:5,t:"Trámite ATU",d:"Solicitud de TUC + pago de derecho",reqs:[
        {k:"pago",l:"💳 Pago de derecho ATU S/ 41.20",done:fDocs.pago},
        {k:"djurada",l:"📝 Declaración jurada electrónica",done:fDocs.djurada},
      ]},
      {n:6,t:"¡Formalizado!",d:"TUC emitida — operas 100% legal",reqs:[]},
    ];
    const curStep=stepData.find(s=>s.n===fs+1);
    const curReqsDone=curStep?curStep.reqs.every(r=>r.done):false;
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
      <Toast/><Hdr title="🛡️ Formalización ATU" sub={"Paso "+fs+"/6 — Ruta hacia tu TUC"} back={()=>setS("drv")}/>
      <div style={{padding:"14px 20px"}}>
        {/* Progress header */}
        <Cd style={{textAlign:"center",padding:20}}>
          <div style={{fontSize:32,fontWeight:800,color:T.tx}}>{fs}/6</div>
          <div style={{display:"flex",gap:3,marginTop:10}}>{[1,2,3,4,5,6].map(i=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<=fs?T.gr:i===fs+1?T.acc:T.card2}}/>)}</div>
          <div style={{fontSize:12,color:fs>=6?T.gr:T.or,marginTop:10}}>{fs>=6?"✅ TUC N° TUC-2026-"+String(Date.now()).slice(-5)+" vigente hasta 2036":"⚠️ Sin TUC: multa 1 UIT (S/ 5,150) + retención vehicular"}</div>
        </Cd>

        {fs>=6&&<Cd style={{background:T.gr+"15",padding:16,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:8}}>🎉</div>
          <div style={{fontSize:18,fontWeight:800,color:T.gr}}>¡Felicitaciones!</div>
          <div style={{fontSize:13,color:T.tx2,marginTop:6}}>Tu Tarjeta Única de Circulación fue emitida por la ATU. Operas 100% dentro de la ley. Tu TUC tiene vigencia de 10 años.</div>
          <Cd style={{marginTop:12,padding:12,background:T.card2,textAlign:"left"}}>
            <div style={{fontSize:12,color:T.tx3,marginBottom:4}}>Datos de la TUC</div>
            <div style={{fontSize:13,color:T.tx}}>N°: <b>TUC-2026-{String(Date.now()).slice(-5)}</b></div>
            <div style={{fontSize:13,color:T.tx}}>Titular: <b>ChaskiRutas S.A.C.</b></div>
            <div style={{fontSize:13,color:T.tx}}>Conductor: <b>{u?.nm||"—"}</b></div>
            <div style={{fontSize:13,color:T.tx}}>Placa: <b>{u?.pl||"—"}</b></div>
            <div style={{fontSize:13,color:T.tx}}>Emisión: <b>{new Date().toLocaleDateString("es-PE")}</b></div>
            <div style={{fontSize:13,color:T.tx}}>Vigencia: <b>10 años</b></div>
          </Cd>
        </Cd>}

        {/* Steps timeline */}
        {stepData.map(st=>{
          const dn=st.n<=fs,cu=st.n===fs+1;
          return <div key={st.n} style={{display:"flex",gap:12,marginBottom:4}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:dn?T.gr:cu?T.acc:T.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:700}}>{dn?"✓":st.n}</div>
              {st.n<6&&<div style={{width:2,height:20,background:dn?T.gr:T.card2}}/>}
            </div>
            <Cd style={{flex:1,marginBottom:4,opacity:dn&&!cu?0.4:1,borderColor:cu?T.acc:T.bd}}>
              <div style={{fontWeight:700,color:dn?T.gr:T.tx,fontSize:14}}>{st.t}</div>
              <div style={{fontSize:12,color:T.tx2,marginTop:2}}>{st.d}</div>
              {/* Current step: show requirements */}
              {cu&&st.reqs.length>0&&<div style={{marginTop:10}}>
                {st.reqs.map(r=><button key={r.k} onClick={()=>{
                  const nd={...fDocs};nd[r.k]=true;setFDocs(nd);
                  nt(r.done?"Ya subido":"📤 "+r.l.split(" ").slice(1).join(" ")+" — Verificando...");
                  setTimeout(()=>nt("✅ Verificado"),1200);
                }} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:6,borderRadius:10,background:r.done?T.gr+"15":T.card2,border:`1px solid ${r.done?T.gr:T.bd}`,cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:r.done?T.gr:T.card,border:`2px solid ${r.done?T.gr:T.tx3}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",flexShrink:0}}>{r.done?"✓":""}</div>
                  <span style={{fontSize:13,color:r.done?T.gr:T.tx}}>{r.l}</span>
                  {!r.done&&<span style={{marginLeft:"auto",fontSize:11,color:T.acc}}>Subir →</span>}
                </button>)}
                {/* Special content per step */}
                {st.n===4&&<Cd style={{background:T.card2,padding:12,marginTop:6}}>
                  <div style={{fontSize:12,color:T.tx2,lineHeight:1.6}}>
                    <b style={{color:T.tx}}>Cláusulas principales:</b><br/>
                    • Comisión plataforma: 15% por viaje<br/>
                    • Cobertura de seguro ante accidentes<br/>
                    • Obligación de mantener documentos vigentes<br/>
                    • Derecho a suspensión por rating menor a 4.0<br/>
                    • Resolución unilateral con 30 días de aviso
                  </div>
                </Cd>}
                {st.n===5&&<Cd style={{background:T.card2,padding:12,marginTop:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:T.tx,marginBottom:4}}><span>Derecho de trámite ATU</span><span style={{fontWeight:700}}>S/ 41.20</span></div>
                  <div style={{fontSize:11,color:T.tx3}}>Pago se procesa vía pasarela segura · Banco de la Nación</div>
                </Cd>}
                <Btn disabled={!curReqsDone} onClick={()=>{setFs(fs+1);nt(fs+1>=6?"🎉 ¡TUC emitida! Ya puedes operar legal":"✅ Paso "+(fs+1)+" completado")}} style={{marginTop:8,padding:"12px"}}>
                  {curReqsDone?"Completar paso "+(fs+1):"Completa todos los requisitos arriba"}
                </Btn>
              </div>}
              {dn&&<div style={{marginTop:6,fontSize:11,color:T.gr}}>✅ Verificado el {new Date(Date.now()-st.n*86400000).toLocaleDateString("es-PE")}</div>}
            </Cd>
          </div>})}
      </div>
    </div>)}

  // ═══ ADMIN ══════════════════════════════════════════════════════════════════
  if(s==="admin"){
    const drivers=U.filter(x=>x.rl==="conductor");
    const pendingDrivers=drivers.filter(d=>(d.fs||0)<6);
    const activeDrivers=drivers.filter(d=>(d.fs||0)>=6);
    const totalRev=bk.reduce((a,b)=>a+(Number(b.fare)||0),0)||1240;
    return(
    <div style={{maxWidth:440,margin:"0 auto",minHeight:"100vh",background:T.bg}}>
      <Toast/><Hdr title="Admin ChaskiRutas" sub="Panel de gestión" back={()=>{setU(null);setS("splash")}}/>
      <div style={{padding:"14px 20px"}}>
        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          {[{l:"Viajes",v:bk.length||8},{l:"Ingresos",v:"S/"+totalRev.toFixed(0)},{l:"Comisión 15%",v:"S/"+(totalRev*.15).toFixed(0)},{l:"Conductores",v:drivers.length},{l:"Aprobados",v:activeDrivers.length},{l:"Pendientes",v:pendingDrivers.length}].map((k,i)=>
            <Cd key={i} style={{textAlign:"center",padding:12}}><div style={{fontSize:10,color:T.tx3}}>{k.l}</div><div style={{fontSize:18,fontWeight:800,color:T.tx}}>{k.v}</div></Cd>
          )}
        </div>

        {/* Document review section */}
        <div style={{fontSize:15,fontWeight:700,color:T.tx,marginBottom:10}}>📋 Revisión de documentos</div>
        <Cd style={{background:T.or+"15",padding:12,marginBottom:8}}>
          <div style={{fontSize:12,color:T.or}}>⚠️ {pendingDrivers.length} conductor{pendingDrivers.length!==1?"es":""} pendiente{pendingDrivers.length!==1?"s":""} de revisión. La cuenta se activa solo tras aprobación del admin.</div>
        </Cd>

        {drivers.map(d=><Cd key={d.id} style={{borderLeft:`4px solid ${(d.fs||0)>=6?T.gr:T.or}`}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:T.card2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{d.em}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:T.tx}}>{d.nm}</div>
              <div style={{fontSize:12,color:T.tx2}}>Tel: {d.tel} · Placa: {d.pl||"—"}</div>
            </div>
            <Bdg bg={(d.fs||0)>=6?T.gr+"22":T.or+"22"} fg={(d.fs||0)>=6?T.gr:T.or}>{(d.fs||0)>=6?"✓ Activo":"Paso "+(d.fs||0)+"/6"}</Bdg>
          </div>
          {/* Document checklist */}
          <div style={{padding:"8px 12px",background:T.card2,borderRadius:10,fontSize:12,color:T.tx2}}>
            {["DNI verificado","Licencia","Antecedentes","SOAT","CITV","Tarjeta propiedad","Contrato firmado","Pago ATU"].map((doc,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:i<7?`1px solid ${T.bd}`:"none"}}>
              <span>{doc}</span>
              <span style={{color:i<(d.fs||0)*1.5?T.gr:T.tx3}}>{i<(d.fs||0)*1.5?"✅ OK":"⏳ Pend."}</span>
            </div>)}
          </div>
          {(d.fs||0)<6&&<div style={{display:"flex",gap:6,marginTop:10}}>
            <Btn bg={T.gr} fg="#fff" onClick={()=>{
              const idx=U.findIndex(x=>x.id===d.id);if(idx>=0){U[idx].fs=6}
              nt("✅ "+d.nm+" aprobado — TUC emitida");setS("admin");// force re-render
            }} style={{flex:1,padding:"10px"}}>Aprobar todo</Btn>
            <Btn bg={T.rd} fg="#fff" onClick={()=>nt("❌ Documentación rechazada — Notificado")} style={{flex:1,padding:"10px"}}>Rechazar</Btn>
          </div>}
        </Cd>)}

        {/* Legal compliance */}
        <div style={{fontSize:15,fontWeight:700,color:T.tx,margin:"16px 0 10px"}}>⚖️ Cumplimiento legal</div>
        <Cd style={{padding:14}}>
          <div style={{fontSize:12,color:T.tx2,lineHeight:1.8}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span>Trigger enforce_collective_ban_lima</span><span style={{color:T.gr}}>✅ Activo</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span>Colectivos en Lima/Callao</span><span style={{color:T.gr}}>0 (bloqueado)</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span>API B2G para ATU/MTC</span><span style={{color:T.gr}}>✅ Operativa</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span>Conductores con TUC activa</span><span style={{color:T.acc}}>{activeDrivers.length}/{drivers.length}</span></div>
          </div>
        </Cd>

        {/* Recent trips */}
        <div style={{fontSize:15,fontWeight:700,color:T.tx,margin:"16px 0 10px"}}>📊 Últimos viajes</div>
        {bk.length===0&&<Cd><div style={{fontSize:13,color:T.tx3,textAlign:"center"}}>Sin viajes registrados aún</div></Cd>}
        {bk.slice(-5).reverse().map(b=><Cd key={b.id} style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:T.tx}}>{b.o||""} → {b.d||""}</span>
            <span style={{fontWeight:700,color:T.acc}}>S/ {sf(b.fare||0)}</span>
          </div>
          <div style={{fontSize:11,color:T.tx3,marginTop:2}}>{b.drv||"—"} · {b.tp} · {new Date(b.dt).toLocaleDateString("es-PE")}</div>
        </Cd>)}
      </div>
    </div>)}

  return <div style={{maxWidth:440,margin:"0 auto",padding:40,background:T.bg,minHeight:"100vh"}}><Btn onClick={()=>setS("splash")}>Volver al inicio</Btn></div>;
}
