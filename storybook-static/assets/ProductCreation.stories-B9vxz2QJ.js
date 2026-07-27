import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{R as r,S as i,U as a,Yt as o,l as s,u as c,w as l}from"./iframe-CdhYZE3q.js";import{t as u}from"./ui-BjvJuuqs.js";import{n as d,t as f}from"./BaseInput-C0LI5rus.js";import{t as p}from"./Button-Dpp6Rwit.js";import{n as m,t as h}from"./deferred-Y5oz4BV3.js";function g(e,t){return{...a,id:t,category_id:e.category_id,img_url:e.images,on_stock:e.onStock,price:e.price,price_id:t,translations:i(e.title,e.description),variants:e.variants.map((t,n)=>({...t,id:`variant-${n+1}`,image_url:e.images[0]}))}}function _({initialState:e,onCreate:t}){let n=e===`valid`,[r,i]=(0,y.useState)(n?`Storybook keyboard`:``),[a,o]=(0,y.useState)(n?`A deterministic product created in Storybook.`:``),[s,l]=(0,y.useState)(n?`129.99`:``),[u,d]=(0,y.useState)(n?`category-featured`:``),[m,_]=(0,y.useState)(n?`6`:``),[b,x]=(0,y.useState)(n?`/products/keyboard.png`:``),[S,C]=(0,y.useState)(n?`Black`:``),[w,T]=(0,y.useState)(``),[E,D]=(0,y.useState)(!1),O=(0,y.useRef)(null),k=c(e=>e.products);(0,y.useLayoutEffect)(()=>c.getState().hydrate([]),[]);async function A(){if(E)return;let e=Number(s),n=Number(m);if(!r.trim()||!a.trim()||!(e>0)||!b.trim()||!S.trim()){T(`Complete title, description, price, image, and variant before creating the product.`);return}let i={category_id:u||null,description:a.trim(),images:[b.trim()],onStock:n>0?n:0,price:e,title:r.trim(),variants:[{label:S.trim(),price:e,quantity:n>0?n:0}]},o=`optimistic-storybook-product`,l=h();O.current=l,T(``),D(!0),c.getState().addProduct(g(i,o)),t(i);try{let e=await l.promise;c.getState().replaceProduct(o,e)}catch(e){c.getState().removeProduct(o),T(e instanceof Error?e.message:String(e))}finally{O.current=null,D(!1)}}function j(){let e=O.current,t=c.getState().products.find(e=>e.id.startsWith(`optimistic-`));e&&t&&e.resolve({...t,id:`server-product-23`,price_id:`price-server-23`})}return(0,v.jsxs)(`div`,{className:`grid gap-5 p-5 laptop:grid-cols-[minmax(0,420px)_minmax(0,1fr)]`,children:[(0,v.jsxs)(`form`,{className:`grid gap-3 rounded-xl border border-border-color bg-foreground p-5`,onSubmit:e=>{e.preventDefault(),A()},children:[(0,v.jsx)(`h1`,{className:`text-xl font-semibold text-title`,children:`Create product`}),(0,v.jsx)(f,{"aria-label":`Title`,placeholder:`Title`,value:r,onChange:e=>i(e.target.value)}),(0,v.jsx)(f,{"aria-label":`Description`,placeholder:`Description`,value:a,onChange:e=>o(e.target.value)}),(0,v.jsx)(f,{"aria-label":`Price`,inputMode:`decimal`,placeholder:`Price`,value:s,onChange:e=>l(e.target.value)}),(0,v.jsx)(f,{"aria-label":`Category`,placeholder:`Category`,value:u,onChange:e=>d(e.target.value)}),(0,v.jsx)(f,{"aria-label":`Stock`,inputMode:`numeric`,placeholder:`Stock`,value:m,onChange:e=>_(e.target.value)}),(0,v.jsx)(f,{"aria-label":`Image URL`,placeholder:`Image URL`,value:b,onChange:e=>x(e.target.value)}),(0,v.jsx)(f,{"aria-label":`Variant`,placeholder:`Variant`,value:S,onChange:e=>C(e.target.value)}),(0,v.jsx)(p,{disabled:E,loading:E,loadingText:`Creating`,type:`submit`,children:`Create product`}),w&&(0,v.jsx)(`p`,{className:`text-sm text-danger`,role:`alert`,children:w})]}),(0,v.jsxs)(`section`,{className:`rounded-xl border border-border-color bg-background p-5`,children:[(0,v.jsxs)(`div`,{className:`mb-4 flex items-center justify-between gap-3`,children:[(0,v.jsx)(`h2`,{className:`text-lg font-semibold text-title`,children:`Owner products`}),E&&(0,v.jsx)(`span`,{className:`rounded bg-info/10 px-2 py-1 text-xs text-info`,role:`status`,children:`Translation pending`})]}),k.length===0?(0,v.jsx)(`p`,{className:`text-subTitle`,children:`No products yet.`}):(0,v.jsx)(`ul`,{className:`grid gap-2`,children:k.map(e=>(0,v.jsxs)(`li`,{className:`rounded border border-border-color bg-foreground p-3`,"data-product-id":e.id,children:[(0,v.jsx)(`strong`,{children:e.translations.en.title}),(0,v.jsx)(`span`,{className:`ml-2 text-xs text-subTitle`,children:e.id})]},e.id))}),E&&(0,v.jsxs)(`div`,{className:`mt-4 flex gap-2`,children:[(0,v.jsx)(p,{onClick:j,size:`sm`,variant:`success`,children:`Resolve request`}),(0,v.jsx)(p,{onClick:()=>O.current?.reject(Error(`Create request failed`)),size:`sm`,variant:`danger`,children:`Reject request`})]})]})]})}var v,y,b,x,S,C,w,T,E,D,O,k,A,j,M,N;e((()=>{v=o(),y=t(n()),m(),r(),l(),s(),d(),u(),{expect:b,fn:x,userEvent:S,waitFor:C,within:w}=__STORYBOOK_MODULE_TEST__,T={title:`Admin/ProductCreationWorkbench`,component:_,args:{initialState:`empty`,onCreate:x()}},E={},D={args:{initialState:`valid`}},O={play:async({canvasElement:e})=>{let t=w(e);await S.click(await t.findByRole(`button`,{name:`Create product`})),await b(await t.findByRole(`alert`)).toHaveTextContent(`Complete title`)}},k={args:{initialState:`valid`},play:async({canvasElement:e})=>{let t=w(e);await S.click(await t.findByRole(`button`,{name:`Create product`})),await b(await t.findByRole(`status`)).toHaveTextContent(`pending`),await b(t.getByRole(`button`,{name:`Creating`})).toBeDisabled()}},A={args:{initialState:`valid`},play:async({args:e,canvasElement:t})=>{let n=w(t);await S.click(await n.findByRole(`button`,{name:`Create product`})),await b(t.querySelector(`[data-product-id="optimistic-storybook-product"]`)).toBeInTheDocument(),await b(e.onCreate).toHaveBeenCalledWith(b.objectContaining({title:`Storybook keyboard`,price:129.99})),await S.click(n.getByRole(`button`,{name:`Resolve request`})),await C(()=>b(t.querySelector(`[data-product-id="server-product-23"]`)).toBeInTheDocument()),await b(t.querySelector(`[data-product-id="optimistic-storybook-product"]`)).not.toBeInTheDocument()}},j={args:{initialState:`valid`},play:async({canvasElement:e})=>{let t=w(e);await S.click(await t.findByRole(`button`,{name:`Create product`})),await b(e.querySelector(`[data-product-id="optimistic-storybook-product"]`)).toBeInTheDocument(),await S.click(t.getByRole(`button`,{name:`Reject request`})),await C(()=>b(e.querySelector(`[data-product-id="optimistic-storybook-product"]`)).not.toBeInTheDocument()),await b(await t.findByRole(`alert`)).toHaveTextContent(`Create request failed`)}},M={args:{initialState:`valid`},play:async({args:e,canvasElement:t})=>{let n=w(t),r=await n.findByRole(`button`,{name:`Create product`});await S.dblClick(r),await b(e.onCreate).toHaveBeenCalledOnce(),await b(n.getByRole(`button`,{name:`Creating`})).toBeDisabled()}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    initialState: "valid"
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", {
      name: "Create product"
    }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Complete title");
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    initialState: "valid"
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", {
      name: "Create product"
    }));
    await expect(await canvas.findByRole("status")).toHaveTextContent("pending");
    await expect(canvas.getByRole("button", {
      name: "Creating"
    })).toBeDisabled();
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    initialState: "valid"
  },
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", {
      name: "Create product"
    }));
    await expect(canvasElement.querySelector('[data-product-id="optimistic-storybook-product"]')).toBeInTheDocument();
    await expect(args.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: "Storybook keyboard",
      price: 129.99
    }));
    await userEvent.click(canvas.getByRole("button", {
      name: "Resolve request"
    }));
    await waitFor(() => expect(canvasElement.querySelector('[data-product-id="server-product-23"]')).toBeInTheDocument());
    await expect(canvasElement.querySelector('[data-product-id="optimistic-storybook-product"]')).not.toBeInTheDocument();
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    initialState: "valid"
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", {
      name: "Create product"
    }));
    await expect(canvasElement.querySelector('[data-product-id="optimistic-storybook-product"]')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", {
      name: "Reject request"
    }));
    await waitFor(() => expect(canvasElement.querySelector('[data-product-id="optimistic-storybook-product"]')).not.toBeInTheDocument());
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Create request failed");
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    initialState: "valid"
  },
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const findByRoleResp = await canvas.findByRole("button", {
      name: "Create product"
    });
    await userEvent.dblClick(findByRoleResp);
    await expect(args.onCreate).toHaveBeenCalledOnce();
    await expect(canvas.getByRole("button", {
      name: "Creating"
    })).toBeDisabled();
  }
}`,...M.parameters?.docs?.source}}},N=[`EmptyForm`,`ValidForm`,`ValidationErrors`,`InsertingState`,`OptimisticThenConfirmed`,`FailedRollback`,`DuplicateSubmissionPrevention`]}))();export{M as DuplicateSubmissionPrevention,E as EmptyForm,j as FailedRollback,k as InsertingState,A as OptimisticThenConfirmed,D as ValidForm,O as ValidationErrors,N as __namedExportsOrder,T as default};