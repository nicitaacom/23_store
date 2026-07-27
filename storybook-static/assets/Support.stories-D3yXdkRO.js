import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{a as r,d as i,n as a,p as o}from"./client-Cqr6_oOt.js";import{B as s,F as c,I as l,J as u,K as d,L as f,M as p,N as m,P as h,R as ee,Yt as g,a as _,g as te,h as ne,i as re,it as ie,m as ae,o as v,p as oe,r as se,rt as ce,z as le}from"./iframe-CdhYZE3q.js";import{i as ue,o as y}from"./esm-1JbrSO5M.js";import{F as de,M as fe,S as pe,t as me,x as he}from"./ui-BjvJuuqs.js";import{b as ge,d as _e,g as ve,h as ye,x as be}from"./index.esm-DEn5q-vp.js";import{a as xe,c as Se,i as Ce,n as we,o as Te,r as Ee,s as De,t as Oe}from"./getUploadedImageResolution-DE238G9Z.js";import{a as ke,r as Ae}from"./index.esm-BBcM-Yyk.js";import{n as je,t as Me}from"./useOnEscOrClickOutside-T5nx0vQc.js";import{a as Ne,c as Pe,i as Fe,l as Ie,n as Le,o as Re,s as ze,t as Be,u as Ve}from"./OrganicCanvasBackground-D8nO6QwU.js";import{t as b}from"./Button-Dpp6Rwit.js";import{h as He,n as Ue}from"./index.esm-BXc_jsY6.js";import{n as We,t as Ge}from"./deferred-Y5oz4BV3.js";import{r as Ke,t as qe}from"./user-BVqfHdvv.js";import{i as Je,n as Ye,r as Xe,t as Ze}from"./MessageInput-DGyix_1u.js";function Qe({isClosedBySupport:e,ticketId:t,messagesLength:n}){let r=o(),{closeDropdown:i}=v(),[a,s]=(0,S.useState)(null),[c,l]=(0,S.useState)(null),[u,d]=(0,S.useState)(!1),[p,m]=(0,S.useState)(!1),[h,ee]=(0,S.useState)(!1);async function g(){d(!1),m(!0),await f.closeTicket({ticketId:t||``,closedBy:`user`})}async function _(e){s(e),m(!1),e?(ee(!0),setTimeout(()=>{ee(!1),i()},1500)):i(),r.refresh(),await f.rateTicket({ticketId:t,rate:e})}let te=Array.from({length:5},(e,t)=>{let n=t+1;return(0,x.jsx)(`button`,{className:`rounded p-1 transition-transform duration-150 hover:scale-105`,"aria-label":`Rate ${n} out of 5`,onMouseEnter:()=>l(n),onMouseLeave:()=>l(null),onClick:()=>_(n),type:`button`,children:n<=(c||a||0)?(0,x.jsx)(Ae,{className:`text-warning`,size:30}):(0,x.jsx)(Fe,{className:`text-icon-color`,size:30})},n)}),ne=(e,t)=>y(`absolute inset-0 ${t} flex items-center justify-center bg-background/80 px-5 backdrop-blur-sm transition-all duration-200`,e?`visible opacity-100`:`invisible opacity-0`);return(0,x.jsxs)(x.Fragment,{children:[(0,x.jsx)(`button`,{className:y(`flex h-8 w-8 items-center justify-center rounded border border-white/16 bg-white/8 text-white/85 transition-colors duration-150 hover:border-success-accent/40 hover:bg-success-accent/15 hover:text-success-accent`,n===0&&`cursor-not-allowed opacity-55`),"aria-label":n===0?`Close unavailable for empty ticket`:`Close ticket`,onClick:()=>n!==0&&d(!0),title:n===0?`I don't let you close empty ticket`:`Close ticket`,type:`button`,children:(0,x.jsx)(Ue,{size:16})}),(0,x.jsx)(`div`,{className:ne(u&&!e,`z-30`),children:(0,x.jsxs)(`div`,{className:`w-full max-w-[270px] rounded-lg border border-border-color/35 bg-foreground/95 p-4 text-center shadow-compact-lg`,children:[(0,x.jsx)(`h1`,{className:`text-base font-semibold text-title`,children:`Close this ticket?`}),(0,x.jsx)(`p`,{className:`mt-2 text-sm text-subTitle`,children:`You can rate the conversation right after closing it.`}),(0,x.jsxs)(`div`,{className:`mt-3 flex justify-center gap-2`,children:[(0,x.jsx)(b,{className:`w-fit`,variant:`success-outline`,size:`sm`,onClick:g,children:`Yes`}),(0,x.jsx)(b,{className:`w-fit`,variant:`danger-outline`,size:`sm`,onClick:()=>d(!1),children:`No`})]})]})}),(0,x.jsx)(`div`,{className:ne(p||e,`z-40`),children:(0,x.jsxs)(`div`,{className:`w-full max-w-[290px] rounded-lg border border-border-color/35 bg-foreground/95 p-4 text-center shadow-compact-lg`,children:[(0,x.jsx)(`h1`,{className:`text-base font-semibold text-title`,children:`Please rate this ticket`}),(0,x.jsx)(`div`,{className:`mt-3 flex justify-center gap-1.5`,children:te}),(0,x.jsx)(b,{className:`mt-3`,variant:`default-outline`,size:`sm`,onClick:()=>_(null),children:`I don't want`})]})}),(0,x.jsx)(`div`,{className:ne(h,`z-50`),children:(0,x.jsx)(`div`,{className:`w-full max-w-[220px] rounded-lg border border-border-color/35 bg-foreground/95 p-4 text-center shadow-compact-lg`,children:(0,x.jsx)(`h1`,{className:`text-lg font-semibold text-title`,children:`Thank you`})})})]})}var x,S,$e=e((()=>{x=g(),S=t(n()),i(),Ne(),ke(),He(),ue(),l(),_(),me(),Qe.__docgenInfo={description:``,methods:[],displayName:`MarkTicketAsCompletedUser`,props:{isClosedBySupport:{required:!0,tsType:{name:`boolean`},description:``},ticketId:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:``},messagesLength:{required:!0,tsType:{name:`number`},description:``}}}})),et,tt,nt=e((()=>{et=t(n()),Ie(),tt=({isEnabled:e=!0,onCloseBySupport:t,onCloseByUser:n,ticketId:r})=>{(0,et.useEffect)(()=>{if(!e||!r)return;let i=Pe(),a=r;Ve(a);let o=()=>n?.(),s=()=>t?.();return i.unbind(`tickets:closeByUser`),i.bind(`tickets:closeByUser`,o),i.unbind(`tickets:closeBySupport`),i.bind(`tickets:closeBySupport`,s),()=>{i.unbind(`tickets:closeByUser`,o),i.unbind(`tickets:closeBySupport`,s),i.unsubscribe(a)}},[e,t,n,r])}})),C,rt,it=e((()=>{C=t(n()),nt(),rt=(e,t)=>{let[n,r]=(0,C.useState)(!1),[i,a]=(0,C.useState)(e);e!==i&&(a(e),r(!1));let o=(0,C.useCallback)(()=>{r(!1),t([])},[t]),s=(0,C.useCallback)(()=>{r(!0),t([])},[t]);return tt({isEnabled:!!e,onCloseBySupport:s,onCloseByUser:o,ticketId:e}),{isClosedBySupport:n}}}));async function at(e,t={},n){let r=re.getState(),i=t.maxNumber??5,a=xe(t.maxFileSize??1048576),o=Te(t.minResolution??Ce);if(e?.acceptType)return r.show(`warning`,`Add file extention`,`Please add file.extention like .jpg or .png or .avif or .webp`);if(e?.maxFileSize)return r.show(`warning`,`Max file size is ${a}`,`Please upload an image that is ${a} or smaller.`);if(e?.maxNumber)return r.show(`warning`,`Max ${i} images`,`Please use max ${i} images`);if(e?.resolution){let e=await Oe(n,t.minResolution??Ce),i=e?Te(e):null;return r.show(`warning`,`Use higher resolution`,i?`You uploaded ${i}px but minimum required resolution is ${o}px.`:`Minimum required resolution is ${o}px.`)}}var ot=e((()=>{De(),we(),se()})),w,st,ct=e((()=>{w=t(n()),st=()=>{let[e,t]=(0,w.useState)(!1),n=(0,w.useRef)(0),r=(0,w.useCallback)(()=>{n.current=0,t(!1)},[]),i=(0,w.useRef)(r);return(0,w.useEffect)(()=>{i.current=r}),(0,w.useEffect)(()=>{let e=e=>Array.from(e.dataTransfer?.types??[]).includes(`Files`),r=r=>{e(r)&&(r.preventDefault(),n.current+=1,t(!0))},a=r=>{e(r)&&(--n.current,n.current<=0&&(n.current=0,t(!1)))},o=t=>{e(t)&&t.preventDefault()},s=()=>i.current();return window.addEventListener(`dragenter`,r),window.addEventListener(`dragleave`,a),window.addEventListener(`dragover`,o),window.addEventListener(`drop`,s),()=>{window.removeEventListener(`dragenter`,r),window.removeEventListener(`dragleave`,a),window.removeEventListener(`dragover`,o),window.removeEventListener(`drop`,s)}},[]),{isDragging:e,handleDrop:r}}}));function lt(){let{image:e,setImage:t}=c(),{isDragging:n,handleDrop:r}=st();return(0,T.jsx)(`div`,{className:y(`pointer-events-none absolute inset-0`,n?`z-30`:`z-0`),children:(0,T.jsx)(ut.default,{value:e,onChange:e=>{let n=e.map(e=>e.file).filter(Boolean);t(n[0])},maxNumber:1,maxFileSize:Ee,onError:(e,t)=>{at(e,{maxNumber:1,maxFileSize:Ee},t)},children:({dragProps:e})=>(0,T.jsx)(`div`,{className:y(`absolute inset-0 transition-all duration-200`,n?`pointer-events-auto`:`pointer-events-none`),...e,onDrop:t=>{e.onDrop(t),r()},children:(0,T.jsx)(`section`,{className:y(`absolute inset-3 flex items-center justify-center rounded-[24px] border-2 border-dashed transition-all duration-200`,n?`border-success/45 bg-background/72 opacity-100 backdrop-blur-sm`:`border-transparent opacity-0`),children:(0,T.jsxs)(`div`,{className:`rounded-[20px] border border-success/20 bg-success/10 px-4 py-3 text-center shadow-[0_18px_40px_rgba(0,0,0,0.18)]`,children:[(0,T.jsx)(`p`,{className:`text-sm font-semibold text-title`,children:`Drop image here`}),(0,T.jsx)(`p`,{className:`mt-1 text-xs text-subTitle`,children:`Attach 1 image to your support message`})]})})})})})}var T,ut,dt=e((()=>{T=g(),ut=t(Se()),ue(),ot(),ct(),h(),De(),lt.__docgenInfo={description:``,methods:[],displayName:`DragAndDropArea`}}));function ft(e,t){let n=new Date(e),r=Intl.DateTimeFormat().resolvedOptions().timeZone,i=new Date;if(n.getDate()===i.getDate()&&n.getMonth()===i.getMonth()&&n.getFullYear()===i.getFullYear()){let e=n.getHours().toString().padStart(2,`0`),i=n.getMinutes().toString().padStart(2,`0`);return t?`${e}:${i}`:`${e}:${i} (${r})`}let a=new Date(i);if(a.setDate(i.getDate()-1),n.getDate()===a.getDate()&&n.getMonth()===a.getMonth()&&n.getFullYear()===a.getFullYear()){let e=n.getHours().toString().padStart(2,`0`),i=n.getMinutes().toString().padStart(2,`0`);return t?`Yesterday at ${e}:${i}`:`Yesterday at ${e}:${i} (${r})`}let o=n.getDate().toString().padStart(2,`0`),s=(n.getMonth()+1).toString().padStart(2,`0`),c=n.getFullYear(),l=n.getHours().toString().padStart(2,`0`),u=n.getMinutes().toString().padStart(2,`0`);return t?`${o}.${s}.${c} at ${l}:${u}`:`${o}.${s}.${c} at ${l}:${u} (${r})`}var pt=e((()=>{})),mt,ht=e((()=>{ze(),Ke(),ne(),p(),mt=(e,t)=>{let{user:n}=m(),{isDarkMode:r}=te(),i=`/placeholder.jpg`,a=`/BiUserCircle-dark.svg`,o=`/BiUserCircle-light.svg`,s=n?.id||Re(),c=s===t,l=qe(n),u=``;return u=!n||s?.includes(`anonymousId`)?r?a:o:c?l||i:t?.includes(`anonymousId`)?r?a:o:e||i,{isOwn:c,avatar_url:u}}}));function gt({message:e,showTimezone:t,animateEntry:n}){let i=re(),{isOwn:a,avatar_url:o}=mt(e.sender_avatar_url||``,e.sender_id),s=r(`support`),{setImage:c}=ae(),[l,u]=(0,_t.useState)(!1),[d,f]=(0,_t.useState)(!1);if(!e||!e.sender_id)return null;let p=`rounded-br border-success-accent/30 bg-success-accent/12 text-title shadow-compact`,m=`rounded-bl border-border-color/30 bg-background/70 text-title shadow-compact`,h=ft(e.created_at,!t),ee=e.sender_username||`Support`;async function g(e){if(d)return i.show(`warning`,s(`image_no_longer_available`));try{u(!0);let t=await fetch(e);if(!t.ok)return f(!0),i.show(`warning`,s(`image_no_longer_available`));let n=await t.blob(),r=e.split(`/`).pop()?.split(`?`)[0]||`chat-image`,o=new File([n],r,{type:n.type||`image/jpeg`});c(o,a?`user`:`support`,!0)}catch{f(!0),i.show(`warning`,s(`image_no_longer_available`))}finally{u(!1)}}return(0,E.jsxs)(ge.li,{className:y(`flex w-full items-end gap-2`,a&&`justify-end`),initial:n?{opacity:0,y:6}:!1,animate:{opacity:1,y:0},transition:{duration:.12,ease:`easeOut`},children:[!a&&(0,E.jsx)(he,{className:`h-8 w-8 shrink-0 rounded border border-border-color/30 bg-background/70 object-cover shadow-compact`,src:o,alt:`Sender avatar`,width:32,height:32,sizes:`32px`}),(0,E.jsxs)(`article`,{className:y(`flex max-w-[min(82%,440px)] flex-col gap-1`,a&&`items-end`),children:[e.images&&e.images.length===1&&(0,E.jsxs)(`button`,{className:y(`relative w-full max-w-[240px] overflow-hidden rounded border`,a?p:m),onClick:()=>g(e.images[0]),type:`button`,children:[(0,E.jsx)(he,{className:y(`max-h-[220px] w-full object-cover transition-transform duration-300 hover:scale-[1.02]`,l&&`opacity-70`),src:e.images[0],alt:`Message attachment`,width:240,height:240,sizes:`240px`}),(0,E.jsx)(`div`,{className:`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2 text-left`,children:(0,E.jsx)(`p`,{className:`text-[11px] font-medium text-white`,children:d?s(`image_no_longer_available`):l?`Opening preview...`:`Open image`})})]}),e.images&&e.images.length>1&&(0,E.jsx)(`div`,{className:y(`w-fit rounded border px-2 py-1 text-xs`,a?p:m),children:s(`images_attached`,{number:e.images.length})}),e.body&&(0,E.jsx)(`div`,{className:y(`w-fit max-w-full break-words rounded border px-3 py-2 text-[13px] leading-[1.5]`,`whitespace-pre-wrap`,a?p:m),children:e.body}),(0,E.jsxs)(`div`,{className:y(`flex items-center gap-1.5 px-1 text-[10px] text-subTitle`,a&&`justify-end`),children:[!a&&(0,E.jsx)(`span`,{className:`font-medium text-subTitle`,children:ee}),!a&&(0,E.jsx)(`span`,{className:`h-1 w-1 rounded-full bg-subTitle/40`}),(0,E.jsx)(`span`,{children:h}),a&&(0,E.jsxs)(`span`,{className:`relative ml-1 flex items-center pr-2 text-success-accent`,children:[(0,E.jsx)(fe,{size:14}),e.seen&&(0,E.jsx)(fe,{className:`absolute left-[5px]`,size:14})]})]})]})]})}var E,_t,vt=e((()=>{E=g(),_t=t(n()),ve(),de(),ue(),pt(),oe(),a(),ht(),se(),pe(),gt.__docgenInfo={description:``,methods:[],displayName:`MessageBox`,props:{message:{required:!0,tsType:{name:`TMessageDB`},description:``},showTimezone:{required:!1,tsType:{name:`boolean`},description:`Show the timezone suffix in the meta time (thread view); off in the compact chat window.`},animateEntry:{required:!1,tsType:{name:`boolean`},description:``}}}}));function yt(e,t){let n=new Date(e),r=new Date(t);return n.getFullYear()===r.getFullYear()&&n.getMonth()===r.getMonth()&&n.getDate()===r.getDate()}function bt(e){let t=new Date(e);return yt(e,new Date().toISOString())?`Today`:new Intl.DateTimeFormat(void 0,{day:`numeric`,month:`short`}).format(t)}var xt,St=e((()=>{xt=yt})),Ct,wt,Tt=e((()=>{Ct=t(n()),wt=()=>{let[e,t]=(0,Ct.useState)(()=>typeof document<`u`&&document.visibilityState===`visible`&&document.hasFocus());return(0,Ct.useEffect)(()=>{if(typeof document>`u`)return;let e=e=>{t(t=>t===e?t:e)},n=()=>{e(document.visibilityState===`visible`&&document.hasFocus())},r=()=>e(!0),i=()=>e(!1);return document.addEventListener(`visibilitychange`,n),window.addEventListener(`focus`,r),window.addEventListener(`blur`,i),()=>{document.removeEventListener(`visibilitychange`,n),window.removeEventListener(`focus`,r),window.removeEventListener(`blur`,i)}},[]),{isActiveTab:e}}})),Et,Dt,Ot=e((()=>{Et=t(n()),l(),Tt(),Dt=(e,t,n,r,i)=>{let{isActiveTab:a}=wt();(0,Et.useEffect)(()=>{e&&!i&&t&&n.length>0&&r&&a&&f.markMessagesAsSeen({ticketId:t,messages:n,userId:r})},[e,t,n,r,i,a])}}));function kt(e,t){(0,At.useEffect)(()=>{setTimeout(()=>{e.current&&(e.current.scrollTop=e.current.scrollHeight)},25)},[t])}var At,jt=e((()=>{At=t(n())})),Mt,Nt,Pt=e((()=>{Mt=t(n()),Ie(),Nt=({bottomRef:e,isEnabled:t,messages:n,onSeen:r,setMessages:i,ticketId:a})=>{let o=(0,Mt.useRef)(n);(0,Mt.useEffect)(()=>{o.current=n},[n]),(0,Mt.useEffect)(()=>{if(!t||!a)return;let n=Pe(),s=a;Ve(s);let c=()=>{setTimeout(()=>{e.current&&(e.current.scrollTop=e.current.scrollHeight)},10)};c();let l=e=>{if(o.current.some(t=>t.id===e.id))return;let t=[...o.current,e];o.current=t,i(t),c()},u=e=>{let t=o.current.map(t=>e.find(e=>e.id===t.id)||t);o.current=t,i(t),r?.(e)};return n.unbind(`messages:new`),n.bind(`messages:new`,l),n.unbind(`messages:seen`),n.bind(`messages:seen`,u),()=>{n.unbind(`messages:new`,l),n.unbind(`messages:seen`,u),n.unsubscribe(s)}},[e,t,r,i,a])}}));function Ft(){let e=r(`support`),t=(0,O.useRef)(null),{user:n}=m(),i=n?.id||Re(),{isLoading:a}=ie(),{isDropdown:o}=v(),{messages:s,ticketId:l,setMessages:u}=c(),[d]=(0,O.useState)(()=>new Set(s.map(e=>e.id)));Dt(o,l,s,i,a),kt(t,o);let{isClosedBySupport:f}=rt(l,u);return Nt({bottomRef:t,isEnabled:!!i&&o,messages:s,setMessages:u,ticketId:l}),(0,D.jsxs)(`section`,{className:`relative flex h-[440px] w-[min(92vw,390px)] flex-col overflow-hidden rounded-lg border border-border-color/35 bg-modal-surface shadow-compact-lg mobile:h-[540px]`,children:[(0,D.jsxs)(Be,{className:`h-auto shrink-0 overflow-hidden border-b border-border-color/30 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.06),transparent_30%),linear-gradient(135deg,rgba(17,20,26,0.98),rgba(23,29,38,0.96))]`,parentClassName:`relative flex items-start justify-between gap-2 px-3 py-3`,particleCount:2,brandHsl:`137, 82%, 52%`,canvasOpacity:.4,verticalOverflow:12,children:[(0,D.jsxs)(`div`,{className:`flex min-w-0 items-center gap-3`,children:[(0,D.jsx)(`div`,{className:`flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/16 bg-white/8 text-success-accent`,children:(0,D.jsx)(_e,{size:18})}),(0,D.jsxs)(`div`,{className:`min-w-0`,children:[(0,D.jsx)(`p`,{className:`text-[10px] font-semibold uppercase tracking-[0.18em] text-success/85`,children:`Support`}),(0,D.jsx)(`h1`,{className:`text-[16px] font-semibold text-white mobile:text-[18px]`,children:e(`ready_title`)}),(0,D.jsx)(`p`,{className:`mt-0.5 text-[11px] text-white/55`,children:e(`response_time`,{number:15})})]})]}),(0,D.jsx)(Qe,{isClosedBySupport:f,messagesLength:s.length,ticketId:l},l||`empty-ticket`)]}),a?(0,D.jsx)(`div`,{className:`flex flex-1 items-center justify-center px-4`,children:(0,D.jsx)(`div`,{className:`rounded border border-border-color/35 bg-background/35 px-4 py-3 text-center`,children:(0,D.jsxs)(`p`,{className:`text-sm font-medium text-title`,children:[e(`loading_messages`),`...`]})})}):(0,D.jsxs)(`div`,{className:`relative flex min-h-0 flex-1 flex-col bg-background/35`,children:[s.length?(0,D.jsx)(`ul`,{className:`panel-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3`,ref:t,children:s.map((e,t)=>(0,D.jsxs)(O.Fragment,{children:[(t===0||!xt(s[t-1].created_at,e.created_at))&&(0,D.jsx)(`li`,{className:`flex justify-center py-1`,children:(0,D.jsx)(`span`,{className:`rounded border border-border-color/35 bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-subTitle`,children:bt(e.created_at)})}),(0,D.jsx)(gt,{animateEntry:!d.has(e.id),message:e})]},e.id))}):(0,D.jsx)(`div`,{className:`flex flex-1 items-center justify-center px-4 py-5`,children:(0,D.jsxs)(`div`,{className:`max-w-[260px] rounded border border-border-color/35 bg-background/35 px-4 py-5 text-center`,children:[(0,D.jsx)(`p`,{className:`text-base font-semibold text-title`,children:e(`ready_title`)}),(0,D.jsxs)(`p`,{className:`mt-2 text-sm text-subTitle`,children:[e(`no_messages_yet`),`.`]})]})}),(0,D.jsx)(Ze,{placeholder:e(`message_placeholder`)})]}),(0,D.jsx)(lt,{})]})}var D,O,It=e((()=>{D=g(),O=t(n()),ye(),it(),dt(),$e(),vt(),Ye(),ze(),St(),ce(),Ot(),h(),a(),jt(),Pt(),_(),p(),Le(),Ft.__docgenInfo={description:``,methods:[],displayName:`SupportButtonDropdown`}}));function Lt(){let e=(0,Rt.useRef)(null),{unseenMessagesNumber:t}=c(),{isDropdown:n,closeDropdown:r,toggle:i}=v();return je(e,r,{ignoreInputs:!0,isHookEnabled:n}),(0,k.jsxs)(`div`,{className:`fixed bottom-4 right-4 z-[120] mobile:bottom-5 mobile:right-5`,ref:e,children:[(0,k.jsx)(be,{children:n&&(0,k.jsx)(ge.div,{className:`pointer-events-auto absolute bottom-[calc(100%+14px)] right-0 origin-bottom-right`,initial:{opacity:0,y:12,scale:.98},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:8,scale:.98},transition:{type:`spring`,stiffness:380,damping:32},children:(0,k.jsx)(Ft,{})})}),(0,k.jsxs)(b,{className:`relative h-12 w-12 border border-success/30 bg-background/95 px-0 shadow-compact backdrop-blur-xl transition-colors duration-150 hover:border-success/45 hover:bg-foreground/80 desktop:h-14 desktop:w-14`,"data-cy":`open-support`,variant:`default-outline`,size:`icon-md`,rounded:`lg`,onClick:i,"aria-expanded":n,"aria-label":`Open support chat`,children:[(0,k.jsx)(_e,{className:`h-6 w-6 text-icon-color desktop:h-7 desktop:w-7`}),t>0&&(0,k.jsx)(`span`,{className:`absolute -right-0.5 -top-0.5 min-w-[20px] rounded border border-background bg-success px-1.5 py-0.5 text-[10px] font-semibold text-title-foreground`,children:t>99?`99+`:t})]})]})}var k,Rt,zt=e((()=>{k=g(),Rt=t(n()),ve(),ye(),me(),Me(),h(),_(),It(),Lt.__docgenInfo={description:``,methods:[],displayName:`SupportButton`}}));function Bt({isLoading:e=!1,messages:t,open:n,unread:r,user:i}){return(0,j.useLayoutEffect)(()=>{m.setState({user:i}),ie.setState({isLoading:e}),c.setState({messages:t,ticketId:u.ticket,unseenMessagesNumber:r}),v.setState({isDropdown:n})},[e,t,n,r,i]),(0,A.jsxs)(`div`,{className:`min-h-[620px] bg-background p-6`,children:[(0,A.jsx)(`p`,{className:`max-w-md text-subTitle`,children:`Support stays available above the current page without contacting a live service.`}),(0,A.jsx)(Lt,{})]})}function Vt({onSend:e}){let[t,n]=(0,j.useState)(``),[r,i]=(0,j.useState)(!1);async function a(t,r){n(``),i(!0);try{await e(t,r)}catch(e){n(e instanceof Error?e.message:`Message failed`)}finally{i(!1)}}return(0,A.jsxs)(`div`,{className:`mx-auto max-w-md rounded-lg border border-border-color bg-modal-surface`,children:[(0,A.jsx)(Ze,{onSend:a,placeholder:`Write to support`}),r&&(0,A.jsx)(`p`,{className:`px-4 pb-3 text-sm text-info`,role:`status`,children:`Sending message…`}),t&&(0,A.jsx)(`p`,{className:`px-4 pb-3 text-sm text-danger`,role:`alert`,children:t})]})}function Ht(){return(0,j.useLayoutEffect)(()=>{c.setState({image:new File([`storybook image`],`support.png`,{type:`image/png`})})},[]),(0,A.jsx)(`div`,{className:`p-6`,children:(0,A.jsx)(Xe,{})})}function Ut({closedBySupport:e=!1}){return(0,A.jsx)(`div`,{className:`relative h-[340px] max-w-sm rounded-lg border border-border-color bg-modal-surface p-4`,children:(0,A.jsx)(Qe,{isClosedBySupport:e,messagesLength:d.length,ticketId:u.ticket})})}var A,j,M,N,P,F,I,Wt,Gt,L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q,$,Kt;e((()=>{A=g(),j=t(n()),We(),s(),ee(),l(),ce(),h(),_(),p(),$e(),Ye(),Je(),zt(),{expect:M,fn:N,userEvent:P,waitFor:F,within:I}=__STORYBOOK_MODULE_TEST__,Wt=N(async()=>void 0),Gt={title:`Support/SupportExample`,component:Bt,args:{messages:d,open:!1,unread:0,user:le},parameters:{layout:`fullscreen`}},L={},R={args:{unread:12}},z={args:{open:!0}},B={args:{messages:[],open:!0}},V={args:{isLoading:!0,open:!0}},H={args:{open:!0},play:async({canvasElement:e})=>{let t=I(e);await F(()=>M(t.getByText(`Could you help me choose a variant?`)).toBeVisible()),await M(t.getByText(`The black variant is available and ready to ship.`)).toBeVisible(),await M(t.getByRole(`button`,{name:/message attachment/i})).toBeVisible(),await M(t.getAllByText(/feb/i).length).toBeGreaterThanOrEqual(2)}},U={args:{messages:[d[0],{...d[1],id:`missing-image`,images:[`/storybook-missing-support-image.png`]}],open:!0}},W={play:async({canvasElement:e})=>{let t=I(e),n=await t.findByRole(`button`,{name:`Open support chat`});await P.click(n),await F(()=>M(n).toHaveAttribute(`aria-expanded`,`true`)),await F(()=>M(t.getByText(`Could you help me choose a variant?`)).toBeVisible()),await P.keyboard(`{Escape}`),await F(()=>M(n).toHaveAttribute(`aria-expanded`,`false`))}},G={args:{messages:[],open:!0,user:null}},K={args:{open:!0},parameters:{viewport:{defaultViewport:`mobileSmall`}}},q={args:{open:!0},parameters:{viewport:{defaultViewport:`desktop`}}},J={args:{messages:[],user:null},render:()=>(0,A.jsx)(Vt,{onSend:Wt}),play:async({canvasElement:e})=>{let t=I(e),n=await t.findByPlaceholderText(`Write to support`);await P.type(n,`Please help with my order`),await P.click(t.getByRole(`button`)),await M(n).toHaveValue(``),await M(Wt).toHaveBeenCalledWith(`Please help with my order`,null)}},Y={render:()=>{let e=Ge();return(0,A.jsx)(Vt,{onSend:N(()=>e.promise)})},play:async({canvasElement:e})=>{let t=I(e);await P.type(await t.findByPlaceholderText(`Write to support`),`Pending reply`),await P.keyboard(`{Enter}`),await M(await t.findByRole(`status`)).toHaveTextContent(`Sending`)}},X={render:()=>(0,A.jsx)(Vt,{onSend:N(async()=>{throw Error(`Support is temporarily unavailable`)})}),play:async({canvasElement:e})=>{let t=I(e);await P.type(await t.findByPlaceholderText(`Write to support`),`Retry this message`),await P.keyboard(`{Enter}`),await M(await t.findByRole(`alert`)).toHaveTextContent(`temporarily unavailable`)}},Z={render:Ht,play:async({canvasElement:e})=>{let t=I(e);await M(await t.findByText(/image attached/i)).toBeVisible(),await P.click(t.getByTitle(/remove image/i)),await F(()=>M(t.queryByText(/image attached/i)).not.toBeInTheDocument())}},Q={render:()=>(0,A.jsx)(Ut,{closedBySupport:!0})},$={render:()=>(0,A.jsx)(Ut,{}),play:async({canvasElement:e})=>{let t=I(e);await P.click(await t.findByTitle(`Close ticket`)),await F(()=>M(t.getByText(`Close this ticket?`)).toBeVisible()),await P.click(t.getByRole(`button`,{name:`Yes`})),await F(()=>M(t.getByText(`Please rate this ticket`)).toBeVisible()),await P.click(t.getByRole(`button`,{name:`Rate 1 out of 5`})),await F(()=>M(t.getByText(`Thank you`)).toBeVisible()),await M(f.closeTicket).toHaveBeenCalledWith({closedBy:`user`,ticketId:u.ticket}),await M(f.rateTicket).toHaveBeenCalledWith({rate:1,ticketId:u.ticket})}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  args: {
    unread: 12
  }
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  args: {
    open: true
  }
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  args: {
    messages: [],
    open: true
  }
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  args: {
    isLoading: true,
    open: true
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  args: {
    open: true
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText("Could you help me choose a variant?")).toBeVisible());
    await expect(canvas.getByText("The black variant is available and ready to ship.")).toBeVisible();
    await expect(canvas.getByRole("button", {
      name: /message attachment/i
    })).toBeVisible();
    await expect(canvas.getAllByText(/feb/i).length).toBeGreaterThanOrEqual(2);
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  args: {
    messages: [fixtureMessages[0], {
      ...fixtureMessages[1],
      id: "missing-image",
      images: ["/storybook-missing-support-image.png"]
    }],
    open: true
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const findByRoleResp = await canvas.findByRole("button", {
      name: "Open support chat"
    });
    await userEvent.click(findByRoleResp);
    await waitFor(() => expect(findByRoleResp).toHaveAttribute("aria-expanded", "true"));
    await waitFor(() => expect(canvas.getByText("Could you help me choose a variant?")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(findByRoleResp).toHaveAttribute("aria-expanded", "false"));
  }
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  args: {
    messages: [],
    open: true,
    user: null
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  args: {
    open: true
  },
  parameters: {
    viewport: {
      defaultViewport: "mobileSmall"
    }
  }
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  args: {
    open: true
  },
  parameters: {
    viewport: {
      defaultViewport: "desktop"
    }
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  args: {
    messages: [],
    user: null
  },
  render: () => <ComposerExample onSend={sendMessage} />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const findByPlaceholderTextResp = await canvas.findByPlaceholderText("Write to support");
    await userEvent.type(findByPlaceholderTextResp, "Please help with my order");
    await userEvent.click(canvas.getByRole("button"));
    await expect(findByPlaceholderTextResp).toHaveValue("");
    await expect(sendMessage).toHaveBeenCalledWith("Please help with my order", null);
  }
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: () => {
    const deferred = createDeferred<void>();
    return <ComposerExample onSend={fn(() => deferred.promise)} />;
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByPlaceholderText("Write to support"), "Pending reply");
    await userEvent.keyboard("{Enter}");
    await expect(await canvas.findByRole("status")).toHaveTextContent("Sending");
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  render: () => <ComposerExample onSend={fn(async () => {
    throw new Error("Support is temporarily unavailable");
  })} />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByPlaceholderText("Write to support"), "Retry this message");
    await userEvent.keyboard("{Enter}");
    await expect(await canvas.findByRole("alert")).toHaveTextContent("temporarily unavailable");
  }
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  render: AttachmentExample,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/image attached/i)).toBeVisible();
    await userEvent.click(canvas.getByTitle(/remove image/i));
    await waitFor(() => expect(canvas.queryByText(/image attached/i)).not.toBeInTheDocument());
  }
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  render: () => <CompletedTicketExample closedBySupport />
}`,...Q.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  render: () => <CompletedTicketExample />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTitle("Close ticket"));
    await waitFor(() => expect(canvas.getByText("Close this ticket?")).toBeVisible());
    await userEvent.click(canvas.getByRole("button", {
      name: "Yes"
    }));
    await waitFor(() => expect(canvas.getByText("Please rate this ticket")).toBeVisible());
    await userEvent.click(canvas.getByRole("button", {
      name: "Rate 1 out of 5"
    }));
    await waitFor(() => expect(canvas.getByText("Thank you")).toBeVisible());
    await expect(supportSDK.closeTicket).toHaveBeenCalledWith({
      closedBy: "user",
      ticketId: FIXTURE_IDS.ticket
    });
    await expect(supportSDK.rateTicket).toHaveBeenCalledWith({
      rate: 1,
      ticketId: FIXTURE_IDS.ticket
    });
  }
}`,...$.parameters?.docs?.source}}},Kt=[`ClosedButton`,`UnreadCount`,`OpenConversation`,`EmptyConversation`,`LoadingConversation`,`MultiDayOwnAndForeignMessages`,`ImageFallback`,`OpenCloseAndCleanup`,`AnonymousAccess`,`MobileLayout`,`DesktopLayout`,`MessageSubmission`,`PendingSend`,`FailedSend`,`AttachmentPreview`,`CompletedBySupport`,`CompleteAndRate`]}))();export{G as AnonymousAccess,Z as AttachmentPreview,L as ClosedButton,$ as CompleteAndRate,Q as CompletedBySupport,q as DesktopLayout,B as EmptyConversation,X as FailedSend,U as ImageFallback,V as LoadingConversation,J as MessageSubmission,K as MobileLayout,H as MultiDayOwnAndForeignMessages,W as OpenCloseAndCleanup,z as OpenConversation,Y as PendingSend,R as UnreadCount,Kt as __namedExportsOrder,Gt as default};