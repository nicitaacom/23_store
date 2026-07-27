import{i as e,l as t}from"./preload-helper-CmHZQJgV.js";import{t as n}from"./react-vwKXSa21.js";import{Yt as r,it as i,rt as a}from"./iframe-CdhYZE3q.js";import{f as o,h as s}from"./index.esm-DEn5q-vp.js";import{n as c,t as l}from"./Button-Dpp6Rwit.js";import{n as u,t as d}from"./AreYouSureModalContainer-abusMpBL.js";import{n as f,t as p}from"./ModalContainer-SFMygo4R.js";function m({initialOpen:e=!0,pending:t=!1}){let[n,r]=(0,_.useState)(e);return(0,_.useLayoutEffect)(()=>(i.setState({isLoading:t}),()=>i.setState({isLoading:!1})),[t]),(0,g.jsxs)(`div`,{className:`p-3`,children:[(0,g.jsx)(l,{onClick:()=>r(!0),children:`Open modal`}),(0,g.jsxs)(p,{isOpen:n,label:`Account settings`,onClose:()=>r(!1),children:[(0,g.jsx)(`p`,{className:`text-sm text-subTitle`,children:`Modal content remains isolated from application services.`}),(0,g.jsx)(l,{loading:t,loadingText:`Updating account`,children:`Update account`})]})]})}function h({onCancel:e,onConfirm:t}){let[n,r]=(0,_.useState)(!0);function i(){e(),r(!1)}function a(){t(),r(!1)}return(0,g.jsx)(d,{isOpen:n,label:`Delete Joki wireless headphones?`,subTitle:`This action permanently removes the product.`,primaryButtonAction:a,primaryButtonIcon:o,primaryButtonLabel:`Delete product`,primaryButtonVariant:`danger`,secondaryButtonAction:i,secondaryButtonLabel:`Cancel`})}var g,_,v,y,b,x,S,C,w,T,E,D,O,k;e((()=>{g=r(),_=t(n()),s(),a(),u(),c(),f(),{expect:v,fn:y,userEvent:b,waitFor:x,within:S}=__STORYBOOK_MODULE_TEST__,C={title:`UI/Overlays/Modal containers/ModalContainer`,component:m},w={},T={args:{initialOpen:!1},play:async({canvasElement:e})=>{let t=S(e),n=await x(()=>t.getByRole(`button`,{name:`Open modal`}));await b.click(n);let r=await x(()=>t.getByRole(`button`,{name:`Close modal`}));await x(()=>v(r).toHaveFocus()),await b.keyboard(`{Escape}`),await x(()=>v(t.queryByRole(`dialog`)).not.toBeInTheDocument()),await v(n).toHaveFocus()}},E={play:async({canvasElement:e})=>{let t=S(e),n=(await x(()=>t.getByRole(`dialog`,{name:`Account settings`}))).parentElement;if(!n)throw Error(`Modal backdrop was not rendered`);await b.pointer([{target:n,keys:`[MouseLeft>]`},{target:n,keys:`[/MouseLeft]`}]),await x(()=>v(t.queryByRole(`dialog`)).not.toBeInTheDocument())}},D={args:{pending:!0},play:async({canvasElement:e})=>{let t=S(e),n=await x(()=>t.getByRole(`button`,{name:`Close modal`}));await v(n).toBeDisabled(),await b.keyboard(`{Escape}`),await x(()=>v(t.getByRole(`dialog`)).toBeVisible())}},O={render:function(){return(0,g.jsx)(h,{onCancel:y(),onConfirm:y()})},play:async({canvasElement:e})=>{let t=S(e),n=await x(()=>t.getByRole(`button`,{name:/Delete product/}));await x(()=>v(n).toHaveFocus()),await b.keyboard(`{Enter}`),await x(()=>v(t.queryByRole(`dialog`)).not.toBeInTheDocument())}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    initialOpen: false
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const launchButton = await waitFor(() => canvas.getByRole("button", {
      name: "Open modal"
    }));
    await userEvent.click(launchButton);
    const closeButton = await waitFor(() => canvas.getByRole("button", {
      name: "Close modal"
    }));
    await waitFor(() => expect(closeButton).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(launchButton).toHaveFocus();
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await waitFor(() => canvas.getByRole("dialog", {
      name: "Account settings"
    }));
    const backdrop = dialog.parentElement;
    if (!backdrop) throw new Error("Modal backdrop was not rendered");
    await userEvent.pointer([{
      target: backdrop,
      keys: "[MouseLeft>]"
    }, {
      target: backdrop,
      keys: "[/MouseLeft]"
    }]);
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    pending: true
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const closeButton = await waitFor(() => canvas.getByRole("button", {
      name: "Close modal"
    }));
    await expect(closeButton).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.getByRole("dialog")).toBeVisible());
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: function RenderConfirmation() {
    return <ConfirmationExample onCancel={fn()} onConfirm={fn()} />;
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const deleteButton = await waitFor(() => canvas.getByRole("button", {
      name: /Delete product/
    }));
    await waitFor(() => expect(deleteButton).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
  }
}`,...O.parameters?.docs?.source}}},k=[`Open`,`FocusEscapeAndReturn`,`OutsideClick`,`PendingProtection`,`DestructiveConfirmation`]}))();export{O as DestructiveConfirmation,T as FocusEscapeAndReturn,w as Open,E as OutsideClick,D as PendingProtection,k as __namedExportsOrder,C as default};