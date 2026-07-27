import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{R as r,U as i,Yt as a,l as o,u as s}from"./iframe-CdhYZE3q.js";import{t as c}from"./ui-BjvJuuqs.js";import{n as l,t as u}from"./BaseInput-C0LI5rus.js";import{t as d}from"./Button-Dpp6Rwit.js";import{n as f,t as p}from"./deferred-Y5oz4BV3.js";function m(e,t){return t===`title`?e.translations.en.title:t===`description`?e.translations.en.description:t===`price`?String(e.price):t===`category`?e.category_id??``:t===`stock`?String(e.on_stock):t===`images`?e.img_url.join(`, `):(e.variants??[]).map(e=>e.label).join(`, `)}function h(e,t,n){return t===`title`?{...e,translations:{...e.translations,en:{...e.translations.en,title:n}}}:t===`description`?{...e,translations:{...e.translations,en:{...e.translations.en,description:n}}}:t===`price`?{...e,price:Number(n)}:t===`category`?{...e,category_id:n||null}:t===`stock`?{...e,on_stock:Number(n)}:t===`images`?{...e,img_url:n.split(`,`).map(e=>e.trim()).filter(Boolean)}:{...e,variants:n.split(`,`).map((t,n)=>({id:`storybook-variant-${n+1}`,image_url:e.img_url[0],label:t.trim(),price:e.price,quantity:e.on_stock})).filter(e=>e.label)}}function g(e,t){let n={productId:t.id};return e===`title`?{...n,field:`title`,value:t.translations.en.title}:e===`description`?{...n,field:`description`,value:t.translations.en.description}:e===`price`?{...n,price:t.price}:e===`category`?{...n,category_id:t.category_id}:e===`stock`?{...n,onStock:t.on_stock}:e===`images`?{...n,images:t.img_url}:{...n,variants:t.variants}}function _({family:e,onUpdate:t}){let[n,r]=(0,b.useState)(()=>m(i,e)),[a,o]=(0,b.useState)(``),[c,l]=(0,b.useState)(!1),f=(0,b.useRef)(null),_=(0,b.useRef)(i),v=s(e=>e.products[0]);(0,b.useLayoutEffect)(()=>{_.current=i,s.getState().hydrate([i])},[e]);async function x(){if(c)return;let r=s.getState().products[0],i=h(r,e,n.trim()),a=p();f.current=a,o(``),l(!0),s.getState().replaceProduct(r.id,i),t(g(e,i));try{let e=await a.promise;_.current=e,s.getState().replaceProduct(r.id,e)}catch(e){s.getState().replaceProduct(r.id,_.current),o(e instanceof Error?e.message:String(e))}finally{f.current=null,l(!1)}}function S(){let e=s.getState().products[0];f.current?.resolve(e)}return(0,y.jsxs)(`div`,{className:`mx-auto grid max-w-4xl gap-5 p-5 tablet:grid-cols-2`,children:[(0,y.jsxs)(`section`,{className:`rounded-xl border border-border-color bg-foreground p-5`,children:[(0,y.jsxs)(`p`,{className:`text-xs font-semibold uppercase tracking-widest text-subTitle`,children:[`Update `,e]}),(0,y.jsx)(`h1`,{className:`mt-2 text-xl font-semibold text-title`,children:v?.translations.en.title}),(0,y.jsxs)(`label`,{className:`mt-5 block text-sm text-subTitle`,htmlFor:`update-value`,children:[`New `,e]}),(0,y.jsx)(u,{id:`update-value`,value:n,onChange:e=>r(e.target.value)}),(0,y.jsxs)(d,{className:`mt-3`,disabled:c,loading:c,loadingText:`Updating`,onClick:x,children:[`Save `,e]}),a&&(0,y.jsx)(`p`,{className:`mt-3 text-sm text-danger`,role:`alert`,children:a})]}),(0,y.jsxs)(`section`,{className:`rounded-xl border border-border-color bg-background p-5`,children:[(0,y.jsx)(`p`,{className:`text-xs uppercase tracking-widest text-subTitle`,children:`Visible product value`}),(0,y.jsx)(`output`,{className:`mt-3 block break-words text-lg font-semibold text-title`,"data-current-value":!0,children:v?m(v,e):``}),c&&(0,y.jsxs)(`div`,{className:`mt-5`,role:`status`,children:[(0,y.jsx)(`p`,{className:`mb-3 text-sm text-info`,children:`Optimistic value visible while request is pending.`}),(0,y.jsxs)(`div`,{className:`flex gap-2`,children:[(0,y.jsx)(d,{onClick:S,size:`sm`,variant:`success`,children:`Resolve update`}),(0,y.jsx)(d,{onClick:()=>f.current?.reject(Error(`${e} update failed`)),size:`sm`,variant:`danger`,children:`Reject update`})]})]})]})]})}async function v(e,t,n,r){let a=T(e),o=await a.findByLabelText(/New /);await C.clear(o),await C.type(o,n),await C.click(a.getByRole(`button`,{name:/Save /})),await x(a.getByText(/Optimistic value visible/)).toBeVisible(),await x(e.querySelector(`[data-current-value]`)).toHaveTextContent(n),await x(t).toHaveBeenLastCalledWith(x.objectContaining({productId:i.id})),await C.click(a.getByRole(`button`,{name:`Resolve update`})),await w(()=>x(a.queryByText(/Optimistic value visible/)).not.toBeInTheDocument()),await C.clear(o),await C.type(o,r),await C.click(a.getByRole(`button`,{name:/Save /})),await x(e.querySelector(`[data-current-value]`)).toHaveTextContent(r),await C.click(a.getByRole(`button`,{name:`Reject update`})),await w(()=>x(e.querySelector(`[data-current-value]`)).toHaveTextContent(n)),await x(await a.findByRole(`alert`)).toHaveTextContent(`update failed`)}var y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P;e((()=>{y=a(),b=t(n()),f(),r(),o(),l(),c(),{expect:x,fn:S,userEvent:C,waitFor:w,within:T}=__STORYBOOK_MODULE_TEST__,E={title:`Admin/ProductUpdateWorkbench`,component:_,args:{family:`title`,onUpdate:S()}},D={play:({args:e,canvasElement:t})=>v(t,e.onUpdate,`Confirmed title`,`Rejected title`)},O={args:{family:`description`},play:({args:e,canvasElement:t})=>v(t,e.onUpdate,`Confirmed description`,`Rejected description`)},k={args:{family:`price`},play:({args:e,canvasElement:t})=>v(t,e.onUpdate,`219.95`,`500`)},A={args:{family:`category`},play:({args:e,canvasElement:t})=>v(t,e.onUpdate,`category-confirmed`,`category-rejected`)},j={args:{family:`stock`},play:({args:e,canvasElement:t})=>v(t,e.onUpdate,`42`,`0`)},M={args:{family:`images`},play:({args:e,canvasElement:t})=>v(t,e.onUpdate,`/confirmed-image.png`,`/rejected-image.png`)},N={args:{family:`variants`},play:({args:e,canvasElement:t})=>v(t,e.onUpdate,`Confirmed black`,`Rejected silver`)},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  play: ({
    args,
    canvasElement
  }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "Confirmed title", "Rejected title")
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    family: "description"
  },
  play: ({
    args,
    canvasElement
  }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "Confirmed description", "Rejected description")
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    family: "price"
  },
  play: ({
    args,
    canvasElement
  }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "219.95", "500")
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    family: "category"
  },
  play: ({
    args,
    canvasElement
  }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "category-confirmed", "category-rejected")
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    family: "stock"
  },
  play: ({
    args,
    canvasElement
  }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "42", "0")
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    family: "images"
  },
  play: ({
    args,
    canvasElement
  }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "/confirmed-image.png", "/rejected-image.png")
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    family: "variants"
  },
  play: ({
    args,
    canvasElement
  }) => verifyConfirmedRollback(canvasElement, args.onUpdate, "Confirmed black", "Rejected silver")
}`,...N.parameters?.docs?.source}}},P=[`Title`,`Description`,`Price`,`Category`,`Stock`,`Images`,`Variants`]}))();export{A as Category,O as Description,M as Images,k as Price,j as Stock,D as Title,N as Variants,P as __namedExportsOrder,E as default};