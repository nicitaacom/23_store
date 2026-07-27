import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{R as r,U as i,Yt as a,l as o,u as s}from"./iframe-CdhYZE3q.js";import{t as c}from"./ui-BjvJuuqs.js";import{t as l}from"./Button-Dpp6Rwit.js";import{n as u,t as d}from"./deferred-Y5oz4BV3.js";function f({authorized:e,onDelete:t}){let[n,r]=(0,h.useState)(!1),[a,o]=(0,h.useState)(``),[c,u]=(0,h.useState)(!1),f=(0,h.useRef)(null),p=(0,h.useRef)(null),g=s(e=>e.products);(0,h.useLayoutEffect)(()=>s.getState().hydrate([i]),[]);async function _(){if(c)return;let n=s.getState().products.find(e=>e.id===i.id);if(!n||!e)return;let a=d();f.current=a,p.current=n,r(!1),o(``),u(!0),s.getState().removeProduct(n.id),t({id:n.id});try{await a.promise}catch(e){p.current&&s.getState().addProduct(p.current),o(e instanceof Error?e.message:String(e))}finally{f.current=null,p.current=null,u(!1)}}return(0,m.jsxs)(`div`,{className:`mx-auto max-w-2xl p-5`,children:[(0,m.jsxs)(`section`,{className:`rounded-xl border border-border-color bg-foreground p-5`,children:[(0,m.jsxs)(`div`,{className:`flex items-center justify-between gap-4`,children:[(0,m.jsxs)(`div`,{children:[(0,m.jsx)(`p`,{className:`text-xs uppercase tracking-widest text-subTitle`,children:`Owner product`}),(0,m.jsx)(`h1`,{className:`mt-1 text-xl font-semibold text-title`,children:i.translations.en.title})]}),e&&g.length>0&&(0,m.jsx)(l,{onClick:()=>r(!0),variant:`danger`,children:`Delete product`})]}),!e&&(0,m.jsx)(`p`,{className:`mt-4 rounded border border-warning/30 bg-warning/10 p-3 text-sm text-warning`,children:`Delete controls are hidden for unauthorized users.`}),g.length===0&&!c&&(0,m.jsx)(`p`,{className:`mt-4 text-success`,children:`Product deleted.`}),c&&(0,m.jsxs)(`div`,{className:`mt-4 flex items-center gap-3`,role:`status`,children:[(0,m.jsx)(l,{disabled:!0,loading:!0,loadingText:`Deleting product`,variant:`danger`}),(0,m.jsx)(l,{onClick:()=>f.current?.resolve(),size:`sm`,variant:`success`,children:`Resolve deletion`}),(0,m.jsx)(l,{onClick:()=>f.current?.reject(Error(`Delete request failed`)),size:`sm`,variant:`danger-outline`,children:`Reject deletion`})]}),a&&(0,m.jsx)(`p`,{className:`mt-4 text-danger`,role:`alert`,children:a})]}),n&&(0,m.jsx)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4`,role:`dialog`,"aria-modal":`true`,"aria-labelledby":`delete-title`,children:(0,m.jsxs)(`div`,{className:`w-full max-w-md rounded-xl border border-border-color bg-modal-surface p-5 shadow-compact-lg`,children:[(0,m.jsx)(`h2`,{className:`text-xl font-semibold text-title`,id:`delete-title`,children:`Delete this product?`}),(0,m.jsx)(`p`,{className:`mt-2 text-sm text-subTitle`,children:`The product is removed optimistically and restored if the request fails.`}),(0,m.jsxs)(`div`,{className:`mt-5 flex justify-end gap-2`,children:[(0,m.jsx)(l,{onClick:()=>r(!1),variant:`default-outline`,children:`Cancel`}),(0,m.jsx)(l,{onClick:()=>void _(),variant:`danger`,children:`Confirm deletion`})]})]})})]})}async function p(e){let t=b(e);return await v.click(await t.findByRole(`button`,{name:`Delete product`})),await g(await t.findByRole(`dialog`,{name:`Delete this product?`})).toBeVisible(),t}var m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k;e((()=>{m=a(),h=t(n()),u(),r(),o(),c(),{expect:g,fn:_,userEvent:v,waitFor:y,within:b}=__STORYBOOK_MODULE_TEST__,x={title:`Admin/ProductDeletionWorkbench`,component:f,args:{authorized:!0,onDelete:_()}},S={play:async({canvasElement:e})=>{await p(e)}},C={play:async({canvasElement:e})=>{let t=await p(e);await v.click(t.getByRole(`button`,{name:`Cancel`})),await g(t.queryByRole(`dialog`)).not.toBeInTheDocument(),await g(t.getByRole(`button`,{name:`Delete product`})).toBeVisible()}},w={play:async({args:e,canvasElement:t})=>{let n=await p(t);await v.click(n.getByRole(`button`,{name:`Confirm deletion`})),await g(await n.findByRole(`status`)).toHaveTextContent(`Deleting product`),await g(n.queryByRole(`button`,{name:`Delete product`})).not.toBeInTheDocument(),await g(e.onDelete).toHaveBeenCalledWith({id:i.id})}},T={play:async({canvasElement:e})=>{let t=await p(e);await v.click(t.getByRole(`button`,{name:`Confirm deletion`})),await v.click(await t.findByRole(`button`,{name:`Resolve deletion`})),await y(()=>g(t.queryByRole(`status`)).not.toBeInTheDocument()),await g(t.getByText(`Product deleted.`)).toBeVisible()}},E={play:async({canvasElement:e})=>{let t=await p(e);await v.click(t.getByRole(`button`,{name:`Confirm deletion`})),await v.click(await t.findByRole(`button`,{name:`Reject deletion`})),await g(await t.findByRole(`alert`)).toHaveTextContent(`Delete request failed`),await g(t.getByRole(`button`,{name:`Delete product`})).toBeVisible()}},D={args:{authorized:!1},play:async({canvasElement:e})=>{let t=b(e);await g(await t.findByText(/hidden for unauthorized users/i)).toBeVisible(),await g(t.queryByRole(`button`,{name:`Delete product`})).not.toBeInTheDocument()}},O={play:async({args:e,canvasElement:t})=>{let n=await p(t),r=n.getByRole(`button`,{name:`Confirm deletion`});await v.dblClick(r),await g(e.onDelete).toHaveBeenCalledOnce(),await g(await n.findByRole(`button`,{name:`Deleting product`})).toBeDisabled()}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    await openConfirmation(canvasElement);
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = await openConfirmation(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Cancel"
    }));
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", {
      name: "Delete product"
    })).toBeVisible();
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = await openConfirmation(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Confirm deletion"
    }));
    await expect(await canvas.findByRole("status")).toHaveTextContent("Deleting product");
    await expect(canvas.queryByRole("button", {
      name: "Delete product"
    })).not.toBeInTheDocument();
    await expect(args.onDelete).toHaveBeenCalledWith({
      id: headphonesProduct.id
    });
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = await openConfirmation(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Confirm deletion"
    }));
    await userEvent.click(await canvas.findByRole("button", {
      name: "Resolve deletion"
    }));
    await waitFor(() => expect(canvas.queryByRole("status")).not.toBeInTheDocument());
    await expect(canvas.getByText("Product deleted.")).toBeVisible();
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = await openConfirmation(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Confirm deletion"
    }));
    await userEvent.click(await canvas.findByRole("button", {
      name: "Reject deletion"
    }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Delete request failed");
    await expect(canvas.getByRole("button", {
      name: "Delete product"
    })).toBeVisible();
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    authorized: false
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/hidden for unauthorized users/i)).toBeVisible();
    await expect(canvas.queryByRole("button", {
      name: "Delete product"
    })).not.toBeInTheDocument();
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = await openConfirmation(canvasElement);
    const confirmButton = canvas.getByRole("button", {
      name: "Confirm deletion"
    });
    await userEvent.dblClick(confirmButton);
    await expect(args.onDelete).toHaveBeenCalledOnce();
    await expect(await canvas.findByRole("button", {
      name: "Deleting product"
    })).toBeDisabled();
  }
}`,...O.parameters?.docs?.source}}},k=[`Confirmation`,`Cancel`,`PendingAndOptimisticRemoval`,`SuccessfulDeletion`,`FailedDeletionRecovery`,`UnauthorizedControls`,`DuplicateDeletionPrevention`]}))();export{C as Cancel,S as Confirmation,O as DuplicateDeletionPrevention,E as FailedDeletionRecovery,w as PendingAndOptimisticRemoval,T as SuccessfulDeletion,D as UnauthorizedControls,k as __namedExportsOrder,x as default};